// @ts-nocheck
/**
 * Seed script for PharmaFlow database.
 * Run: cd packages/db && npx tsx seed.ts
 *
 * Requires DATABASE_URL env var.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding PharmaFlow database...");

  // --- Categories ---
  const categories = await Promise.all([
    db.insert(schema.productCategories).values({ name: "OTC Medicines", slug: "otc", sortOrder: 1 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 1 } }).returning(),
    db.insert(schema.productCategories).values({ name: "Vitamins & Supplements", slug: "vitamins", sortOrder: 2 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 2 } }).returning(),
    db.insert(schema.productCategories).values({ name: "Personal Care", slug: "personal-care", sortOrder: 3 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 3 } }).returning(),
    db.insert(schema.productCategories).values({ name: "First Aid", slug: "first-aid", sortOrder: 4 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 4 } }).returning(),
    db.insert(schema.productCategories).values({ name: "Medical Devices", slug: "medical-devices", sortOrder: 5 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 5 } }).returning(),
    db.insert(schema.productCategories).values({ name: "Prescription", slug: "prescription", sortOrder: 6 })
      .onConflictDoUpdate({ target: schema.productCategories.slug, set: { sortOrder: 6 } }).returning(),
  ]);

  const [otc, vitamins, personalCare, firstAid, medDevices, prescription] =
    categories.map((c) => c[0]);

  console.log("  Categories created:", categories.length);

  // --- Products ---
  const productData = [
    // OTC
    {
      name: "Ibuprofen 200mg Tablets",
      slug: "ibuprofen-200mg",
      genericName: "Ibuprofen",
      brandName: "Advil",
      shortDescription: "Pain reliever and fever reducer",
      description:
        "Ibuprofen 200mg tablets provide temporary relief of minor aches and pains. Use for headaches, dental pain, menstrual cramps, muscle aches, and arthritis pain. Also temporarily reduces fever.",
      dosageForm: "Tablet",
      strength: "200mg",
      packSize: "100 tablets",
      manufacturer: "Pfizer",
      countryOfOrigin: "US",
      ndcNumber: "00573-0150-40",
      categoryId: otc.id,
      requiresPrescription: false,
      activeIngredients: [{ name: "Ibuprofen", strength: "200", unit: "mg" }],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 8.99,
    },
    {
      name: "Acetaminophen 500mg Extra Strength",
      slug: "acetaminophen-500mg",
      genericName: "Acetaminophen",
      brandName: "Tylenol",
      shortDescription: "Extra strength pain reliever",
      description:
        "Acetaminophen 500mg caplets for temporary relief of minor aches, pains, and headaches. Extra strength formula.",
      dosageForm: "Caplet",
      strength: "500mg",
      packSize: "100 caplets",
      manufacturer: "Johnson & Johnson",
      countryOfOrigin: "US",
      ndcNumber: "50580-0488-10",
      categoryId: otc.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Acetaminophen", strength: "500", unit: "mg" },
      ],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 7.49,
    },
    {
      name: "Diphenhydramine 25mg Allergy Relief",
      slug: "diphenhydramine-25mg",
      genericName: "Diphenhydramine HCl",
      brandName: "Benadryl",
      shortDescription: "Antihistamine for allergy relief",
      description:
        "Provides fast, effective relief of sneezing, runny nose, itchy eyes, and other allergy symptoms.",
      dosageForm: "Capsule",
      strength: "25mg",
      packSize: "48 capsules",
      manufacturer: "Johnson & Johnson",
      countryOfOrigin: "US",
      ndcNumber: "50580-0225-48",
      categoryId: otc.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Diphenhydramine HCl", strength: "25", unit: "mg" },
      ],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 6.99,
    },
    {
      name: "Omeprazole 20mg Acid Reducer",
      slug: "omeprazole-20mg",
      genericName: "Omeprazole",
      brandName: "Prilosec OTC",
      shortDescription: "Treats frequent heartburn",
      description:
        "Delayed-release tablets for the treatment of frequent heartburn. One pill a day for 24-hour zero heartburn.",
      dosageForm: "Delayed-Release Tablet",
      strength: "20mg",
      packSize: "42 tablets",
      manufacturer: "Procter & Gamble",
      countryOfOrigin: "US",
      ndcNumber: "37000-0625-42",
      categoryId: otc.id,
      requiresPrescription: false,
      activeIngredients: [{ name: "Omeprazole", strength: "20", unit: "mg" }],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 14.99,
    },
    {
      name: "Loratadine 10mg Non-Drowsy Allergy",
      slug: "loratadine-10mg",
      genericName: "Loratadine",
      brandName: "Claritin",
      shortDescription: "24-hour non-drowsy allergy relief",
      description:
        "Non-drowsy 24-hour relief of sneezing, runny nose, itchy and watery eyes, and itchy throat or nose.",
      dosageForm: "Tablet",
      strength: "10mg",
      packSize: "30 tablets",
      manufacturer: "Bayer",
      countryOfOrigin: "US",
      ndcNumber: "11523-7160-02",
      categoryId: otc.id,
      requiresPrescription: false,
      activeIngredients: [{ name: "Loratadine", strength: "10", unit: "mg" }],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 11.49,
    },
    // Vitamins & Supplements
    {
      name: "Vitamin D3 2000 IU Softgels",
      slug: "vitamin-d3-2000iu",
      genericName: "Cholecalciferol",
      brandName: "Nature Made",
      shortDescription: "Supports bone and immune health",
      description:
        "Vitamin D3 2000 IU softgels support bone, teeth, muscle, and immune health. USP verified for quality and purity.",
      dosageForm: "Softgel",
      strength: "2000 IU (50 mcg)",
      packSize: "220 softgels",
      manufacturer: "Nature Made",
      countryOfOrigin: "US",
      ndcNumber: null,
      categoryId: vitamins.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Vitamin D3 (Cholecalciferol)", strength: "2000", unit: "IU" },
      ],
      storageConditions: "Store in a cool, dry place",
      price: 12.99,
    },
    {
      name: "Fish Oil 1000mg Omega-3",
      slug: "fish-oil-1000mg",
      genericName: "Omega-3 Fatty Acids",
      brandName: "Nature Made",
      shortDescription: "Heart health support",
      description:
        "Fish Oil 1000mg softgels with 300mg Omega-3. Helps support a healthy heart. Purified to remove mercury.",
      dosageForm: "Softgel",
      strength: "1000mg",
      packSize: "200 softgels",
      manufacturer: "Nature Made",
      countryOfOrigin: "US",
      ndcNumber: null,
      categoryId: vitamins.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Fish Oil (EPA/DHA Omega-3)", strength: "1000", unit: "mg" },
      ],
      storageConditions: "Store in a cool, dry place",
      price: 15.99,
    },
    {
      name: "Multivitamin Complete Daily",
      slug: "multivitamin-daily",
      genericName: "Multivitamin/Multimineral",
      brandName: "Centrum",
      shortDescription: "Complete daily multivitamin",
      description:
        "Complete multivitamin with essential vitamins and minerals to support overall health. Includes vitamins A, C, D, E, B-complex, and key minerals.",
      dosageForm: "Tablet",
      strength: "Full Spectrum",
      packSize: "200 tablets",
      manufacturer: "GSK",
      countryOfOrigin: "US",
      ndcNumber: null,
      categoryId: vitamins.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Vitamin A", strength: "3500", unit: "IU" },
        { name: "Vitamin C", strength: "110", unit: "mg" },
        { name: "Vitamin D3", strength: "1000", unit: "IU" },
      ],
      storageConditions: "Store at room temperature",
      price: 18.49,
    },
    // Personal Care
    {
      name: "CeraVe Moisturizing Cream",
      slug: "cerave-moisturizing-cream",
      genericName: null,
      brandName: "CeraVe",
      shortDescription: "Daily face and body moisturizer",
      description:
        "Developed with dermatologists. Contains 3 essential ceramides and hyaluronic acid. For normal to dry skin.",
      dosageForm: "Cream",
      strength: null,
      packSize: "19 oz",
      manufacturer: "L'Oreal",
      countryOfOrigin: "US",
      ndcNumber: null,
      categoryId: personalCare.id,
      requiresPrescription: false,
      activeIngredients: [],
      storageConditions: "Store at room temperature",
      price: 16.99,
    },
    // First Aid
    {
      name: "Band-Aid Flexible Fabric Bandages",
      slug: "bandaid-fabric-bandages",
      genericName: null,
      brandName: "Band-Aid",
      shortDescription: "Flexible adhesive bandages",
      description:
        "Band-Aid Brand Flexible Fabric adhesive bandages with Memory-Weave fabric for comfort and flexibility.",
      dosageForm: "Bandage",
      strength: null,
      packSize: "100 bandages",
      manufacturer: "Johnson & Johnson",
      countryOfOrigin: "US",
      ndcNumber: null,
      categoryId: firstAid.id,
      requiresPrescription: false,
      activeIngredients: [],
      storageConditions: "Store in a cool, dry place",
      price: 9.49,
    },
    {
      name: "Neosporin Original Antibiotic Ointment",
      slug: "neosporin-antibiotic-ointment",
      genericName: "Bacitracin/Neomycin/Polymyxin B",
      brandName: "Neosporin",
      shortDescription: "First aid antibiotic ointment",
      description:
        "Triple antibiotic ointment for first aid wound care. Helps prevent infection in minor cuts, scrapes, and burns.",
      dosageForm: "Ointment",
      strength: null,
      packSize: "1 oz tube",
      manufacturer: "Johnson & Johnson",
      countryOfOrigin: "US",
      ndcNumber: "50580-0254-01",
      categoryId: firstAid.id,
      requiresPrescription: false,
      activeIngredients: [
        { name: "Bacitracin Zinc", strength: "400", unit: "units" },
        { name: "Neomycin", strength: "3.5", unit: "mg" },
        { name: "Polymyxin B Sulfate", strength: "5000", unit: "units" },
      ],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 7.99,
    },
    // Medical Devices
    {
      name: "Digital Blood Pressure Monitor",
      slug: "digital-bp-monitor",
      genericName: null,
      brandName: "Omron",
      shortDescription: "Upper arm blood pressure monitor",
      description:
        "Clinically validated automatic upper arm blood pressure monitor with irregular heartbeat detection.",
      dosageForm: "Device",
      strength: null,
      packSize: "1 unit",
      manufacturer: "Omron Healthcare",
      countryOfOrigin: "Japan",
      ndcNumber: null,
      categoryId: medDevices.id,
      requiresPrescription: false,
      activeIngredients: [],
      storageConditions: "Store in a dry place",
      price: 49.99,
    },
    {
      name: "Digital Thermometer",
      slug: "digital-thermometer",
      genericName: null,
      brandName: "Vicks",
      shortDescription: "Fast digital thermometer",
      description:
        "Fast, accurate oral/rectal/underarm digital thermometer with fever alert and memory recall.",
      dosageForm: "Device",
      strength: null,
      packSize: "1 unit",
      manufacturer: "Procter & Gamble",
      countryOfOrigin: "China",
      ndcNumber: null,
      categoryId: medDevices.id,
      requiresPrescription: false,
      activeIngredients: [],
      storageConditions: "Store in a dry place",
      price: 9.99,
    },
    // Prescription (contact to order)
    {
      name: "Amoxicillin 500mg Capsules",
      slug: "amoxicillin-500mg",
      genericName: "Amoxicillin",
      brandName: "Amoxil",
      shortDescription: "Antibiotic for bacterial infections",
      description:
        "Prescription antibiotic used to treat various bacterial infections. Requires a valid prescription from a licensed healthcare provider.",
      dosageForm: "Capsule",
      strength: "500mg",
      packSize: "30 capsules",
      manufacturer: "Teva Pharmaceuticals",
      countryOfOrigin: "US",
      ndcNumber: "00093-3109-01",
      categoryId: prescription.id,
      requiresPrescription: true,
      activeIngredients: [
        { name: "Amoxicillin Trihydrate", strength: "500", unit: "mg" },
      ],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 12.99,
    },
    {
      name: "Lisinopril 10mg Tablets",
      slug: "lisinopril-10mg",
      genericName: "Lisinopril",
      brandName: "Zestril",
      shortDescription: "ACE inhibitor for blood pressure",
      description:
        "Prescription ACE inhibitor for the treatment of high blood pressure and heart failure. Requires valid prescription.",
      dosageForm: "Tablet",
      strength: "10mg",
      packSize: "90 tablets",
      manufacturer: "Lupin Pharmaceuticals",
      countryOfOrigin: "US",
      ndcNumber: "68180-0514-09",
      categoryId: prescription.id,
      requiresPrescription: true,
      activeIngredients: [
        { name: "Lisinopril", strength: "10", unit: "mg" },
      ],
      storageConditions: "Store at 20-25°C (68-77°F)",
      price: 9.99,
    },
  ];

  const createdProducts = [];
  for (const p of productData) {
    const { price, activeIngredients, ...productFields } = p;
    const [product] = await db
      .insert(schema.products)
      .values({
        ...productFields,
        activeIngredients:
          activeIngredients.length > 0 ? activeIngredients : null,
        images: [
          {
            url: `https://placehold.co/600x600/e8f5e9/1b5e20?text=${encodeURIComponent(p.name.split(' ').slice(0, 2).join('+'))}`,
            alt: p.name,
            isPrimary: true,
          },
        ],
      })
      .onConflictDoUpdate({ target: schema.products.slug, set: { updatedAt: new Date() } })
      .returning();

    // Add B2C price (skip if already exists)
    await db.insert(schema.productPrices).values({
      productId: product.id,
      priceType: "b2c",
      amount: price.toFixed(2),
      currency: "USD",
    }).onConflictDoNothing();

    createdProducts.push({ ...product, price });
  }

  console.log("  Products created:", createdProducts.length);

  // --- Drug Interactions ---
  // Ibuprofen + Aspirin interaction
  const ibuprofen = createdProducts.find((p) => p.slug === "ibuprofen-200mg");
  const acetaminophen = createdProducts.find(
    (p) => p.slug === "acetaminophen-500mg"
  );

  if (ibuprofen && acetaminophen) {
    await db.insert(schema.drugInteractions).values({
      drugA: "Ibuprofen",
      drugB: "Acetaminophen",
      severity: "minor",
      description:
        "Generally safe to take together at recommended doses. However, both can affect the liver and kidneys. Use the lowest effective dose for the shortest duration.",
      recommendation:
        "Safe at recommended OTC doses. Do not exceed daily limits of either medication.",
      source: "FDA Drug Interaction Database",
    }).onConflictDoNothing();
  }

  console.log("  Drug interactions seeded");

  // --- Inventory Batches ---
  for (const product of createdProducts) {
    if (product.requiresPrescription) continue; // Skip Rx for now

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 18); // 18 months from now

    await db.insert(schema.inventoryBatches).values({
      productId: product.id,
      batchNumber: `BN-${product.slug.toUpperCase().slice(0, 8)}-001`,
      expiryDate: expiryDate.toISOString().split("T")[0],
      quantityReceived: 500,
      quantityOnHand: 500,
      quantityReserved: 0,
      costPrice: (product.price * 0.6).toFixed(2),
      location: "Warehouse A - Shelf 1",
      isQuarantined: false,
    }).onConflictDoNothing();
  }

  console.log("  Inventory batches created");

  // --- Delivery Zones ---
  const existingZones = await db.select({ id: schema.deliveryZones.id }).from(schema.deliveryZones).limit(1);
  if (existingZones.length === 0) await db.insert(schema.deliveryZones).values([
    {
      name: "New York Metro",
      type: "local",
      states: ["NY", "NJ", "CT"],
      zipRanges: ["10001-10499", "07001-07999"],
      standardDaysMin: 1,
      standardDaysMax: 3,
      standardFee: "5.99",
      expressDays: 1,
      expressFee: "14.99",
      freeDeliveryAbove: "35.00",
      isActive: true,
    },
    {
      name: "East Coast",
      type: "regional",
      states: [
        "ME","NH","VT","MA","RI","PA","DE","MD","VA","WV","NC","SC","GA","FL","DC",
      ],
      standardDaysMin: 2,
      standardDaysMax: 5,
      standardFee: "5.99",
      expressDays: 2,
      expressFee: "19.99",
      freeDeliveryAbove: "35.00",
      isActive: true,
    },
    {
      name: "Midwest",
      type: "regional",
      states: [
        "OH","IN","IL","MI","WI","MN","IA","MO","ND","SD","NE","KS",
      ],
      standardDaysMin: 3,
      standardDaysMax: 5,
      standardFee: "5.99",
      expressDays: 3,
      expressFee: "19.99",
      freeDeliveryAbove: "35.00",
      isActive: true,
    },
    {
      name: "South",
      type: "regional",
      states: ["TX", "OK", "AR", "LA", "MS", "AL", "TN", "KY"],
      standardDaysMin: 3,
      standardDaysMax: 5,
      standardFee: "5.99",
      expressDays: 3,
      expressFee: "19.99",
      freeDeliveryAbove: "35.00",
      isActive: true,
    },
    {
      name: "West Coast",
      type: "regional",
      states: ["CA", "OR", "WA", "NV", "AZ"],
      standardDaysMin: 3,
      standardDaysMax: 7,
      standardFee: "7.99",
      expressDays: 3,
      expressFee: "24.99",
      freeDeliveryAbove: "50.00",
      isActive: true,
    },
    {
      name: "Mountain / Plains",
      type: "regional",
      states: ["MT", "ID", "WY", "CO", "UT", "NM"],
      standardDaysMin: 4,
      standardDaysMax: 7,
      standardFee: "7.99",
      expressDays: 3,
      expressFee: "24.99",
      freeDeliveryAbove: "50.00",
      isActive: true,
    },
    {
      name: "Alaska & Hawaii",
      type: "national",
      states: ["AK", "HI"],
      standardDaysMin: 7,
      standardDaysMax: 14,
      standardFee: "14.99",
      expressDays: 5,
      expressFee: "34.99",
      freeDeliveryAbove: "100.00",
      isActive: true,
    },
  ]);

  console.log(`  Delivery zones: ${existingZones.length > 0 ? "already exist, skipped" : "created"}`);

  // --- Tax Rates (sample state rates) ---
  const taxRates = [
    { state: "NY", productType: "otc_drug", rate: "0.08" },
    { state: "NY", productType: "supplement", rate: "0.08" },
    { state: "NY", productType: "device", rate: "0.08" },
    { state: "CA", productType: "otc_drug", rate: "0.0725" },
    { state: "CA", productType: "supplement", rate: "0.0725" },
    { state: "CA", productType: "device", rate: "0.0725" },
    { state: "TX", productType: "otc_drug", rate: "0.0625" },
    { state: "TX", productType: "supplement", rate: "0.0625" },
    { state: "TX", productType: "device", rate: "0.0625" },
    { state: "FL", productType: "otc_drug", rate: "0.06" },
    { state: "FL", productType: "supplement", rate: "0.06" },
    { state: "FL", productType: "device", rate: "0.06" },
    { state: "PA", productType: "otc_drug", rate: "0.00" },
    { state: "PA", productType: "supplement", rate: "0.06" },
    { state: "PA", productType: "device", rate: "0.06" },
    { state: "NJ", productType: "otc_drug", rate: "0.00" },
    { state: "NJ", productType: "supplement", rate: "0.06625" },
    { state: "NJ", productType: "device", rate: "0.06625" },
    { state: "OR", productType: "otc_drug", rate: "0.00" },
    { state: "OR", productType: "supplement", rate: "0.00" },
    { state: "OR", productType: "device", rate: "0.00" },
    { state: "MT", productType: "otc_drug", rate: "0.00" },
    { state: "MT", productType: "supplement", rate: "0.00" },
    { state: "MT", productType: "device", rate: "0.00" },
  ];

  for (const rate of taxRates) {
    await db.insert(schema.taxRates).values(rate).onConflictDoNothing();
  }

  console.log("  Tax rates created:", taxRates.length);

  // --- Payment Methods ---
  await db.insert(schema.paymentMethods).values([
    {
      method: "zelle",
      label: "Zelle",
      details: "payments@pharmaflow.com",
      instructions:
        "Send payment via Zelle to payments@pharmaflow.com. Include your order number in the memo.",
      isActive: true,
      sortOrder: 1,
    },
    {
      method: "venmo",
      label: "Venmo",
      details: "@PharmaFlow",
      instructions:
        "Send payment via Venmo to @PharmaFlow. Include your order number in the note.",
      isActive: true,
      sortOrder: 2,
    },
    {
      method: "cashapp",
      label: "CashApp",
      details: "$PharmaFlow",
      instructions:
        "Send payment via CashApp to $PharmaFlow. Include your order number in the note.",
      isActive: true,
      sortOrder: 3,
    },
    {
      method: "wire",
      label: "Wire Transfer",
      details:
        "Bank: First National Bank | Routing: 021000021 | Account: 1234567890 | Name: PharmaFlow Inc.",
      instructions:
        "Send wire transfer to the above account. Include your order number as the reference.",
      isActive: true,
      sortOrder: 4,
    },
  ]).onConflictDoNothing();

  console.log("  Payment methods created");

  // --- Cutoff Rules ---
  const existingCutoff = await db.select({ id: schema.cutoffRules.id }).from(schema.cutoffRules).limit(1);
  if (existingCutoff.length === 0) await db.insert(schema.cutoffRules).values({
    name: "Default US Cutoff",
    cutoffHour: 14, // 2pm ET
    cutoffTimezone: "America/New_York",
    processingDays: 1,
    excludesWeekends: true,
    excludesHolidays: true,
    isActive: true,
  });

  console.log(`  Cutoff rules: ${existingCutoff.length > 0 ? "already exist, skipped" : "created"}`);

  console.log("\nSeed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
