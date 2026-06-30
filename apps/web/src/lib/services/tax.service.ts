import { db } from '@/lib/db';
import { taxRates } from '@pharmaflow/db/schema';
import { eq, and } from 'drizzle-orm';
import { redis } from '@/lib/redis';

// Map category slugs to tax product types
const CATEGORY_TAX_MAP: Record<string, string> = {
  peptides: 'supplement',
  vitamins: 'supplement',
  supplements: 'supplement',
  otc: 'otc',
  'first-aid': 'device',
  'medical-devices': 'device',
  prescription: 'rx',
};

// States with no sales tax
const NO_TAX_STATES = ['OR', 'MT', 'NH', 'DE', 'AK'];

export function getProductTaxType(categorySlug: string | null): string {
  if (!categorySlug) return 'general';
  return CATEGORY_TAX_MAP[categorySlug] || 'general';
}

export async function getTaxRate(state: string, productType: string): Promise<number> {
  const stateUpper = state.toUpperCase();

  // No-tax states
  if (NO_TAX_STATES.includes(stateUpper)) return 0;

  // Prescription drugs are exempt in most states
  if (productType === 'rx') return 0;

  // Check cache
  const cacheKey = `tax:${stateUpper}:${productType}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null && cached !== undefined) return Number(cached);

  // Query DB
  const [row] = await db
    .select({ rate: taxRates.rate })
    .from(taxRates)
    .where(and(eq(taxRates.state, stateUpper), eq(taxRates.productType, productType)))
    .limit(1);

  // Fall back to 'general' type if specific type not found
  if (!row) {
    const [general] = await db
      .select({ rate: taxRates.rate })
      .from(taxRates)
      .where(and(eq(taxRates.state, stateUpper), eq(taxRates.productType, 'general')))
      .limit(1);

    const rate = general ? Number(general.rate) : 0;
    await redis.set(cacheKey, rate.toString(), { ex: 3600 });
    return rate;
  }

  const rate = Number(row.rate);
  await redis.set(cacheKey, rate.toString(), { ex: 3600 });
  return rate;
}

interface TaxLineItem {
  price: number;
  quantity: number;
  categorySlug: string | null;
}

export interface TaxCalculation {
  totalTax: number;
  effectiveRate: number;
  breakdown: { productType: string; rate: number; taxableAmount: number; tax: number }[];
}

export async function calculateTax(state: string, items: TaxLineItem[]): Promise<TaxCalculation> {
  const stateUpper = state.toUpperCase();
  const breakdown: TaxCalculation['breakdown'] = [];

  // Group items by tax product type
  const grouped = new Map<string, number>();
  for (const item of items) {
    const type = getProductTaxType(item.categorySlug);
    const amount = item.price * item.quantity;
    grouped.set(type, (grouped.get(type) || 0) + amount);
  }

  let totalTax = 0;
  let totalTaxable = 0;

  for (const [productType, taxableAmount] of grouped) {
    const rate = await getTaxRate(stateUpper, productType);
    const tax = Math.round(taxableAmount * rate * 100) / 100;
    totalTax += tax;
    totalTaxable += taxableAmount;
    breakdown.push({ productType, rate, taxableAmount, tax });
  }

  return {
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: totalTaxable > 0 ? totalTax / totalTaxable : 0,
    breakdown,
  };
}

// Admin: list all tax rates
export async function listTaxRates() {
  return db.select().from(taxRates).orderBy(taxRates.state, taxRates.productType);
}

// Admin: upsert a tax rate
export async function upsertTaxRate(state: string, productType: string, rate: number) {
  const stateUpper = state.toUpperCase();

  const existing = await db
    .select()
    .from(taxRates)
    .where(and(eq(taxRates.state, stateUpper), eq(taxRates.productType, productType)))
    .limit(1);

  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(taxRates)
      .set({ rate: rate.toString(), updatedAt: new Date() })
      .where(eq(taxRates.id, existing[0].id))
      .returning();
  } else {
    [result] = await db
      .insert(taxRates)
      .values({ state: stateUpper, productType, rate: rate.toString() })
      .returning();
  }

  // Clear cache
  await redis.del(`tax:${stateUpper}:${productType}`);

  return result;
}

// Admin: delete a tax rate
export async function deleteTaxRate(id: string) {
  const [row] = await db.select().from(taxRates).where(eq(taxRates.id, id)).limit(1);
  if (!row) return null;

  await db.delete(taxRates).where(eq(taxRates.id, id));
  await redis.del(`tax:${row.state}:${row.productType}`);
  return row;
}
