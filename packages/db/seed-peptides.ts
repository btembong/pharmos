// @ts-nocheck
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedPeptides() {
  console.log('Seeding peptide category and products...');

  // 1. Upsert Peptides category
  let peptideCat = await db.query.productCategories.findFirst({
    where: eq(schema.productCategories.slug, 'peptides'),
  });

  if (!peptideCat) {
    const [cat] = await db
      .insert(schema.productCategories)
      .values({ name: 'Peptides', slug: 'peptides', sortOrder: 0 })
      .returning();
    peptideCat = cat;
    console.log('Created Peptides category');
  } else {
    console.log('Peptides category already exists');
  }

  const catId = peptideCat.id;

  // 2. Peptide products data
  const peptides = [
    {
      name: 'BPC-157',
      slug: 'bpc-157',
      genericName: 'Body Protection Compound-157',
      brandName: 'BPC-157',
      description:
        'BPC-157 (Body Protection Compound-157) is a pentadecapeptide consisting of 15 amino acids. It is a partial sequence of body protection compound (BPC) found in human gastric juice. Extensively studied for its role in tissue repair and regeneration processes in preclinical research models.',
      shortDescription: 'Pentadecapeptide studied for tissue repair and regeneration.',
      dosageForm: 'Lyophilized Powder',
      strength: '5mg',
      packSize: '1 vial × 5mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 99.1,
      molecularWeight: '1419.54 g/mol',
      aminoAcidSequence: 'Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val',
      casNumber: '137525-51-0',
      coaUrl: 'https://pharmos.com/coa/bpc-157-lot-2026-001.pdf',
      vialSizeMg: '5mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Reconstituted solution at 4°C for up to 30 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: true,
      tags: ['peptide', 'research', 'bpc157', 'tissue-repair'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=600&fit=crop',
          alt: 'BPC-157 research peptide vial',
          isPrimary: true,
        },
      ],
      price: 59.99,
    },
    {
      name: 'TB-500',
      slug: 'tb-500',
      genericName: 'Thymosin Beta-4 Fragment',
      brandName: 'TB-500',
      description:
        'TB-500 is a synthetic version of the naturally occurring peptide Thymosin Beta-4 (Tβ4). It is a 43 amino acid peptide found in virtually all human and animal cells. Research has focused on its role in actin regulation, cell migration, angiogenesis, and wound healing processes.',
      shortDescription: 'Thymosin Beta-4 analogue studied for healing and flexibility.',
      dosageForm: 'Lyophilized Powder',
      strength: '5mg',
      packSize: '1 vial × 5mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 99.3,
      molecularWeight: '4963.44 g/mol',
      aminoAcidSequence: 'Ac-Ser-Asp-Lys-Pro-Asp-Met-Ala-Glu-Ile-Glu-Lys-Phe-Asp-Lys-Ser-Lys-Leu-Lys-Lys-Thr-Glu-Thr-Gln-Glu-Lys-Asn-Pro-Leu-Pro-Ser-Lys-Glu-Thr-Ile-Glu-Gln-Glu-Lys-Gln-Ala-Gly-Glu-Ser',
      casNumber: '77591-33-4',
      coaUrl: 'https://pharmos.com/coa/tb-500-lot-2026-001.pdf',
      vialSizeMg: '5mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Reconstituted solution at 4°C for up to 30 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: true,
      tags: ['peptide', 'research', 'tb500', 'thymosin'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=600&h=600&fit=crop',
          alt: 'TB-500 research peptide vial',
          isPrimary: true,
        },
      ],
      price: 64.99,
    },
    {
      name: 'Ipamorelin',
      slug: 'ipamorelin',
      genericName: 'Ipamorelin Acetate',
      brandName: 'Ipamorelin',
      description:
        'Ipamorelin is a selective growth hormone secretagogue and ghrelin mimetic. It is a pentapeptide (Aib-His-D-2-Nal-D-Phe-Lys-NH2) that stimulates the release of growth hormone from the pituitary gland. Widely used in endocrinology research due to its selectivity and minimal effect on other pituitary hormones.',
      shortDescription: 'Selective GH secretagogue widely studied in endocrinology research.',
      dosageForm: 'Lyophilized Powder',
      strength: '5mg',
      packSize: '1 vial × 5mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 99.5,
      molecularWeight: '711.85 g/mol',
      aminoAcidSequence: 'Aib-His-D-2-Nal-D-Phe-Lys-NH2',
      casNumber: '170851-70-4',
      coaUrl: 'https://pharmos.com/coa/ipamorelin-lot-2026-001.pdf',
      vialSizeMg: '5mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Stable for 24 months. Reconstituted: 4°C for up to 30 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: true,
      tags: ['peptide', 'research', 'ipamorelin', 'ghrh', 'secretagogue'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=600&fit=crop',
          alt: 'Ipamorelin research peptide vial',
          isPrimary: true,
        },
      ],
      price: 54.99,
    },
    {
      name: 'CJC-1295',
      slug: 'cjc-1295',
      genericName: 'CJC-1295 No DAC',
      brandName: 'CJC-1295',
      description:
        'CJC-1295 (without DAC) is a synthetic analogue of growth hormone-releasing hormone (GHRH). It is a 29 amino acid peptide that increases plasma GH and IGF-1 levels in research models. The "no DAC" formulation has a shorter half-life compared to the DAC version, making it suitable for pulsatile administration protocols in research settings.',
      shortDescription: 'GHRH analogue with extended half-life. Research-grade purity.',
      dosageForm: 'Lyophilized Powder',
      strength: '5mg',
      packSize: '1 vial × 5mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 99.2,
      molecularWeight: '3367.97 g/mol',
      aminoAcidSequence: 'Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Met-Ser-Arg-NH2',
      casNumber: '863288-34-0',
      coaUrl: 'https://pharmos.com/coa/cjc-1295-lot-2026-001.pdf',
      vialSizeMg: '5mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Reconstituted solution at 4°C for up to 30 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: true,
      tags: ['peptide', 'research', 'cjc1295', 'ghrh'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1614308460949-c4d2f5e4c8e4?w=600&h=600&fit=crop',
          alt: 'CJC-1295 research peptide vial',
          isPrimary: true,
        },
      ],
      price: 59.99,
    },
    {
      name: 'Semaglutide',
      slug: 'semaglutide',
      genericName: 'Semaglutide',
      brandName: 'Semaglutide',
      description:
        'Semaglutide is a glucagon-like peptide-1 (GLP-1) receptor agonist. It is a 31 amino acid long chain fatty acid derivative of human GLP-1 with amino acid substitutions at positions 8 and 34. Extensively used in metabolic disease research and clinical studies for type 2 diabetes and obesity.',
      shortDescription: 'GLP-1 receptor agonist used in metabolic research.',
      dosageForm: 'Lyophilized Powder',
      strength: '2mg',
      packSize: '1 vial × 2mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 99.0,
      molecularWeight: '4113.57 g/mol',
      aminoAcidSequence: 'His-Aib-Glu-Gly-Thr-Phe-Thr-Ser-Asp-Val-Ser-Ser-Tyr-Leu-Glu-Gly-Gln-Ala-Ala-Lys-Glu-Phe-Ile-Ala-Trp-Leu-Val-Arg-Gly-Arg',
      casNumber: '910463-68-2',
      coaUrl: 'https://pharmos.com/coa/semaglutide-lot-2026-001.pdf',
      vialSizeMg: '2mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Protect from light. Reconstituted: 4°C for up to 28 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: true,
      tags: ['peptide', 'research', 'semaglutide', 'glp1', 'metabolic'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&h=600&fit=crop',
          alt: 'Semaglutide research peptide vial',
          isPrimary: true,
        },
      ],
      price: 89.99,
    },
    {
      name: 'DSIP',
      slug: 'dsip',
      genericName: 'Delta Sleep-Inducing Peptide',
      brandName: 'DSIP',
      description:
        'DSIP (Delta Sleep-Inducing Peptide) is a neuropeptide consisting of 9 amino acids. It was first isolated from rabbit cerebral venous blood and has been studied in connection with sleep regulation, neuroendocrine function, and stress response in preclinical models.',
      shortDescription: 'Neuropeptide studied in sleep and neuroendocrine research.',
      dosageForm: 'Lyophilized Powder',
      strength: '5mg',
      packSize: '1 vial × 5mg',
      manufacturer: 'Pharmos Research',
      countryOfOrigin: 'US',
      isResearchCompound: true,
      purityPercent: 98.8,
      molecularWeight: '848.94 g/mol',
      aminoAcidSequence: 'Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu',
      casNumber: '62568-57-4',
      coaUrl: 'https://pharmos.com/coa/dsip-lot-2026-001.pdf',
      vialSizeMg: '5mg',
      storageConditions: 'Store lyophilized peptide at -20°C. Reconstituted solution at 4°C for up to 30 days.',
      requiresPrescription: false,
      isControlledSubstance: false,
      isFeatured: false,
      tags: ['peptide', 'research', 'dsip', 'neuropeptide', 'sleep'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=600&h=600&fit=crop',
          alt: 'DSIP research peptide vial',
          isPrimary: true,
        },
      ],
      price: 44.99,
    },
  ];

  for (const p of peptides) {
    // Skip if slug already exists
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.slug, p.slug),
    });
    if (existing) {
      console.log(`  Skipping ${p.name} (already exists)`);
      continue;
    }

    const { price, ...productData } = p;
    const [product] = await db
      .insert(schema.products)
      .values({ ...productData, categoryId: catId })
      .returning();

    await db.insert(schema.productPrices).values({
      productId: product.id,
      priceType: 'b2c',
      currency: 'USD',
      amount: String(price),
    });

    // Create inventory batch (500 units, 18 months expiry)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 18);
    await db.insert(schema.inventoryBatches).values({
      productId: product.id,
      batchNumber: `BN-${p.slug.toUpperCase().slice(0, 8)}-001`,
      expiryDate: expiryDate.toISOString().split('T')[0],
      quantityReceived: 500,
      quantityOnHand: 500,
      quantityReserved: 0,
      costPrice: (price * 0.4).toFixed(2),
      location: 'Cold Storage A - Shelf 1',
      isQuarantined: false,
    });

    console.log(`  Inserted ${p.name} @ $${price} + inventory batch`);
  }

  // Also ensure existing peptide products have inventory batches
  const allPeptideProducts = await db.query.products.findMany({
    where: eq(schema.products.categoryId, catId),
  });
  for (const prod of allPeptideProducts) {
    const existingBatch = await db.query.inventoryBatches.findFirst({
      where: eq(schema.inventoryBatches.productId, prod.id),
    });
    if (!existingBatch) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 18);
      await db.insert(schema.inventoryBatches).values({
        productId: prod.id,
        batchNumber: `BN-${prod.slug.toUpperCase().slice(0, 8)}-001`,
        expiryDate: expiryDate.toISOString().split('T')[0],
        quantityReceived: 500,
        quantityOnHand: 500,
        quantityReserved: 0,
        costPrice: '20.00',
        location: 'Cold Storage A - Shelf 1',
        isQuarantined: false,
      });
      console.log(`  Added inventory batch for existing product: ${prod.name}`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

seedPeptides().catch((err) => {
  console.error(err);
  process.exit(1);
});
