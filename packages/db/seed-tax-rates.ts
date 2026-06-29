import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { taxRates } from './schema/settings';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// US state tax rates (approximate, for OTC/general products)
// Source: general state sales tax rates as of 2026
const STATE_RATES: [string, number][] = [
  ['AL', 0.04], ['AZ', 0.056], ['AR', 0.065], ['CA', 0.0725],
  ['CO', 0.029], ['CT', 0.0635], ['DC', 0.06], ['FL', 0.06],
  ['GA', 0.04], ['HI', 0.04], ['ID', 0.06], ['IL', 0.0625],
  ['IN', 0.07], ['IA', 0.06], ['KS', 0.065], ['KY', 0.06],
  ['LA', 0.0445], ['ME', 0.055], ['MD', 0.06], ['MA', 0.0625],
  ['MI', 0.06], ['MN', 0.06875], ['MS', 0.07], ['MO', 0.04225],
  ['NE', 0.055], ['NV', 0.0685], ['NJ', 0.06625], ['NM', 0.05125],
  ['NY', 0.04], ['NC', 0.0475], ['ND', 0.05], ['OH', 0.0575],
  ['OK', 0.045], ['PA', 0.06], ['RI', 0.07], ['SC', 0.06],
  ['SD', 0.042], ['TN', 0.07], ['TX', 0.0625], ['UT', 0.061],
  ['VT', 0.06], ['VA', 0.053], ['WA', 0.065], ['WV', 0.06],
  ['WI', 0.05], ['WY', 0.04],
  // No-tax states (zero rate for completeness)
  ['AK', 0], ['DE', 0], ['MT', 0], ['NH', 0], ['OR', 0],
];

const PRODUCT_TYPES = ['otc', 'supplement', 'device', 'general'];

async function seed() {
  console.log('Seeding tax rates...');

  const values: { state: string; productType: string; rate: string }[] = [];

  for (const [state, rate] of STATE_RATES) {
    for (const type of PRODUCT_TYPES) {
      values.push({ state, productType: type, rate: rate.toString() });
    }
  }

  // Insert in batches (upsert-like: skip conflicts)
  for (let i = 0; i < values.length; i += 50) {
    const batch = values.slice(i, i + 50);
    await db.insert(taxRates).values(batch).onConflictDoNothing();
  }

  console.log(`Seeded ${values.length} tax rate entries for ${STATE_RATES.length} states.`);
}

seed().catch(console.error);
