import Anthropic from '@anthropic-ai/sdk';
import { db } from '../lib/db';
import { orderItems, products, productPrices, productPairings } from '@pharmaflow/db/schema';
import { eq, sql, desc, and, isNull, inArray, asc } from 'drizzle-orm';
import { redis } from '../lib/redis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ─── Layer 2: AI Drug Interaction Check ──────────────────────────────────────

export async function aiInteractionCheck(drugA: string, drugB: string): Promise<{
  severity: string;
  description: string;
  recommendation: string;
  confidence: string;
  source: string;
}> {
  type InteractionResult = { severity: string; description: string; recommendation: string; confidence: string; source: string };
  const cacheKey = `ai-ix:${[drugA, drugB].sort().join(':')}`;
  const cached = await redis.get(cacheKey);
  if (cached) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as InteractionResult;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `You are a clinical pharmacology expert. Analyze drug-drug interactions.
Respond ONLY with valid JSON in this exact format:
{"severity":"minor|moderate|major|contraindicated|none","description":"...","recommendation":"...","confidence":"high|medium|low"}
If there is no known interaction, use severity "none". Be concise.`,
    messages: [
      { role: 'user', content: `What is the drug interaction between "${drugA}" and "${drugB}"?` },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text);
    const result = {
      severity: parsed.severity || 'none',
      description: parsed.description || 'No interaction data available',
      recommendation: parsed.recommendation || '',
      confidence: parsed.confidence || 'low',
      source: 'AI (Claude) — verify with pharmacist',
    };

    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 });
    return result;
  } catch {
    return {
      severity: 'none',
      description: 'Unable to determine interaction — pharmacist review recommended',
      recommendation: 'Consult with a pharmacist before concurrent use',
      confidence: 'low',
      source: 'AI (Claude) — parse error',
    };
  }
}

// ─── AI Chatbot ──────────────────────────────────────────────────────────────

export interface ChatProduct {
  productId: string;
  name: string;
  slug: string;
  price: number | null;
  image: string | null;
}

export interface ChatResponse {
  reply: string;
  products: ChatProduct[];
  suggestions: string[];
}

export async function chatWithPharmacist(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context?: { cartItems?: string[]; currentPage?: string; userName?: string }
): Promise<ChatResponse> {
  // Fetch available product names for the AI to reference
  const availableProducts = await db
    .select({ name: products.name, slug: products.slug })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.isActive, true)))
    .limit(200);

  const systemPrompt = `You are Pharmos AI, a helpful pharmacy assistant for the Pharmos online drugstore.
You help customers with:
- Product information (OTC medicines, supplements, vitamins, peptides, first aid)
- General health questions (always recommend consulting a doctor for specific medical advice)
- Order and shipping questions
- Understanding drug interactions (flag major ones, recommend pharmacist review)
- Product recommendations based on symptoms or needs

Rules:
- NEVER diagnose or prescribe. Always recommend seeing a healthcare professional for medical concerns.
- Be concise and helpful. Keep your text reply under 150 words.
- Use markdown formatting: **bold** for emphasis, bullet lists with - for multiple points, \`code\` for product codes.
- If asked about prescription drugs, say "Prescription products require a valid prescription. Please contact us to order."
- For drug interactions, flag any known concerns and recommend pharmacist review.
- You can suggest OTC products by category but don't make specific medical claims.
- Be warm and professional. Use simple language.
${context?.userName ? `- The customer's name is "${context.userName}". Address them by name naturally in your responses (e.g. "Great question, ${context.userName}!" or "${context.userName}, here's what I found"). Don't overdo it — use their name once or twice per response, not every sentence.` : '- If the customer hasn\'t shared their name, just be friendly without a name.'}
${context?.cartItems?.length ? `\nCustomer's cart: ${context.cartItems.join(', ')}` : ''}

IMPORTANT: Always respond with valid JSON in this exact format:
{"reply":"Your helpful text response (use markdown)","productSlugs":["slug1","slug2"],"suggestions":["Follow-up question 1?","Follow-up question 2?"]}

- "reply": Your main response text with markdown formatting
- "productSlugs": Array of product slugs to recommend (empty if none relevant). Max 6.
- "suggestions": 2-3 short follow-up questions the user might want to ask next, contextual to the conversation. Keep each under 30 chars.

Available products (use exact slugs):
${availableProducts.map(p => `${p.name} (slug: ${p.slug})`).join('\n')}

ALWAYS respond with valid JSON. Never plain text.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  let reply = '';
  let productSlugs: string[] = [];
  let suggestions: string[] = [];

  try {
    const parsed = JSON.parse(text);
    reply = parsed.reply || text;
    productSlugs = Array.isArray(parsed.productSlugs) ? parsed.productSlugs.slice(0, 6) : [];
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
  } catch {
    reply = text || 'I apologize, I was unable to process your request. Please try again.';
  }

  // Hydrate product data from DB
  let chatProducts: ChatProduct[] = [];
  if (productSlugs.length > 0) {
    const dbProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        images: products.images,
      })
      .from(products)
      .where(
        and(
          inArray(products.slug, productSlugs),
          isNull(products.deletedAt),
          eq(products.isActive, true)
        )
      );

    // Fetch prices for these products
    const productIds = dbProducts.map(p => p.id);
    const prices = productIds.length > 0
      ? await db
          .select({ productId: productPrices.productId, amount: productPrices.amount })
          .from(productPrices)
          .where(
            and(
              inArray(productPrices.productId, productIds),
              eq(productPrices.priceType, 'b2c')
            )
          )
      : [];

    const priceMap = new Map(prices.map(p => [p.productId, Number(p.amount)]));

    chatProducts = dbProducts.map(p => {
      const primaryImage = p.images?.find((i: { isPrimary: boolean }) => i.isPrimary) || p.images?.[0];
      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: priceMap.get(p.id) ?? null,
        image: primaryImage?.url ?? null,
      };
    });
  }

  return { reply, products: chatProducts, suggestions };
}

// ─── Product Recommendations ─────────────────────────────────────────────────

export async function getFrequentlyBoughtTogether(productId: string, limit = 4) {
  const cacheKey = `fbt:${productId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;

  // 1. Check manual pairings first (admin-configured)
  const manualPairs = await db
    .select({ pairedProductId: productPairings.pairedProductId })
    .from(productPairings)
    .where(eq(productPairings.productId, productId))
    .orderBy(asc(productPairings.sortOrder))
    .limit(limit);

  let productIds: string[] = manualPairs.map((p) => p.pairedProductId);

  // 2. Fall back to order-history analysis if no manual pairs
  if (productIds.length === 0) {
    const orderBased = await db
      .select({
        productId: orderItems.productId,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          sql`${orderItems.orderId} IN (
            SELECT order_id FROM order_items WHERE product_id = ${productId}
          )`,
          sql`${orderItems.productId} != ${productId}`,
          isNull(products.deletedAt),
          eq(products.isActive, true)
        )
      )
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    productIds = orderBased.map((r) => r.productId);
  }

  if (productIds.length === 0) {
    await redis.set(cacheKey, JSON.stringify({ products: [] }), { ex: 21600 });
    return { products: [] };
  }

  // Fetch full product data with images and prices
  const fullProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      images: products.images,
      strength: products.strength,
      dosageForm: products.dosageForm,
    })
    .from(products)
    .where(and(inArray(products.id, productIds), isNull(products.deletedAt), eq(products.isActive, true)));

  // Fetch prices
  const prices = await db
    .select({
      productId: productPrices.productId,
      amount: productPrices.amount,
      priceType: productPrices.priceType,
    })
    .from(productPrices)
    .where(inArray(productPrices.productId, productIds));

  const result = {
    products: fullProducts.map((p) => ({
      ...p,
      prices: prices.filter((pr) => pr.productId === p.id).map((pr) => ({ amount: Number(pr.amount), priceType: pr.priceType })),
    })),
  };

  // Cache for 6 hours
  await redis.set(cacheKey, JSON.stringify(result), { ex: 21600 });
  return result;
}

// ─── AI Product Recommendations ──────────────────────────────────────────────

export async function getAIRecommendations(
  query: string,
  productNames: string[]
): Promise<string[]> {
  if (productNames.length === 0) return [];

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `You are a pharmacy product recommendation engine. Given a customer query and a list of available products, return the top 5 most relevant product names as a JSON array of strings. Only return products from the provided list. Respond with ONLY the JSON array, nothing else.`,
    messages: [
      {
        role: 'user',
        content: `Customer is looking for: "${query}"\n\nAvailable products:\n${productNames.join('\n')}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

// ─── Demand Forecasting ──────────────────────────────────────────────────────

export async function getDemandForecast(productId: string): Promise<{
  predictedDemand30Days: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: string;
  recommendation: string;
}> {
  type ForecastResult = { predictedDemand30Days: number; trend: 'increasing' | 'stable' | 'decreasing'; confidence: string; recommendation: string };
  const cacheKey = `forecast:${productId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as ForecastResult;

  // Get last 90 days of order data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const salesData = await db
    .select({
      month: sql<string>`to_char(${orderItems.createdAt}, 'YYYY-MM')`,
      totalQty: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .where(
      and(
        eq(orderItems.productId, productId),
        sql`${orderItems.createdAt} >= ${ninetyDaysAgo}`
      )
    )
    .groupBy(sql`to_char(${orderItems.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${orderItems.createdAt}, 'YYYY-MM')`);

  if (salesData.length === 0) {
    return {
      predictedDemand30Days: 0,
      trend: 'stable',
      confidence: 'low',
      recommendation: 'Insufficient sales data for forecasting',
    };
  }

  // Simple trend analysis
  const quantities = salesData.map(s => s.totalQty);
  const avgMonthly = quantities.reduce((a, b) => a + b, 0) / quantities.length;

  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (quantities.length >= 2) {
    const recent = quantities[quantities.length - 1];
    const previous = quantities[quantities.length - 2];
    if (recent > previous * 1.15) trend = 'increasing';
    else if (recent < previous * 0.85) trend = 'decreasing';
  }

  const predicted = Math.round(
    trend === 'increasing' ? avgMonthly * 1.15 :
    trend === 'decreasing' ? avgMonthly * 0.85 :
    avgMonthly
  );

  const result = {
    predictedDemand30Days: predicted,
    trend,
    confidence: quantities.length >= 3 ? 'medium' : 'low',
    recommendation: trend === 'increasing'
      ? `Demand is trending up. Consider increasing stock to ${Math.round(predicted * 1.5)} units.`
      : trend === 'decreasing'
      ? `Demand is declining. Current stock levels should be sufficient.`
      : `Demand is stable at ~${predicted} units/month. Maintain current reorder levels.`,
  };

  // Cache for 12 hours
  await redis.set(cacheKey, JSON.stringify(result), { ex: 43200 });
  return result;
}
