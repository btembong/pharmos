import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthError, requireAuth, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import * as productService from '@/lib/services/product.service';

const listQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  dosageForm: z.string().optional(),
  requiresPrescription: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'price_asc', 'price_desc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    const result = await productService.listProducts(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing products:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  genericName: z.string().max(255).optional(),
  brandName: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  activeIngredients: z.array(z.object({ name: z.string(), strength: z.string(), unit: z.string() })).optional(),
  dosageForm: z.string().max(100).optional(),
  strength: z.string().max(100).optional(),
  packSize: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  ndcNumber: z.string().max(20).optional(),
  requiresPrescription: z.boolean().default(false),
  isControlledSubstance: z.boolean().default(false),
  controlledClass: z.string().max(50).optional(),
  storageConditions: z.string().max(255).optional(),
  requiresColdChain: z.boolean().default(false),
  images: z.array(z.object({ url: z.string(), alt: z.string(), isPrimary: z.boolean() })).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('super_admin', 'inventory_manager');
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { basePrice, salePrice, ...productData } = parsed.data;
    const product = await productService.createProduct(productData as any);

    await writeAuditLog({
      actorId: auth.userId,
      actorType: 'staff',
      action: 'product.created',
      entityType: 'product',
      entityId: product.id,
      afterState: { name: product.name, slug: product.slug },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', (error as Error).message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
