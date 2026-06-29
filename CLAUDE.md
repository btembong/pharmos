# CLAUDE.md — PharmaFlow Implementation Guide
# US-Based Online Drugstore
# This file tells Claude exactly how to work on this codebase.
# Read this fully before touching any file.

---

## WHAT THIS PROJECT IS

PharmaFlow is a single-tenant US-based online drugstore / pharmacy ecommerce platform.
It serves **B2C customers only** (individual patients buying OTC drugs, supplements, and health products online).

- Prescription module is **deferred** (Rx products show "Contact us to order")
- B2B wholesale portal is **deferred**
- Payment is **manual** (Zelle, Venmo, CashApp, wire transfer — no integrated gateway)

Full specification lives in: `PHARMAFLOW_PLAN.md`

---

## MONOREPO STRUCTURE

```
pharmaflow/
├── apps/
│   ├── web/          → Next.js 14 App Router (storefront + admin)
│   └── api/          → Node.js + Express REST API
├── packages/
│   ├── db/           → Drizzle ORM schema + migrations
│   ├── types/        → Shared TypeScript types
│   └── utils/        → Shared utility functions
├── turbo.json
└── package.json
```

Run dev:
```bash
pnpm dev               # Starts all apps via Turborepo
pnpm dev --filter=web  # Web only
pnpm dev --filter=api  # API only
```

---

## TECH STACK — EXACT VERSIONS & RULES

| Layer | Technology | Rule |
|---|---|---|
| Frontend | Next.js 14 App Router | Always use Server Components by default. Client components only when needed (interactivity, hooks). |
| Styling | Tailwind CSS + shadcn/ui | Use shadcn components. Never write raw CSS. |
| Backend | Node.js 20 + Express | REST only. No GraphQL. No tRPC. |
| ORM | Drizzle ORM | Never write raw SQL unless Drizzle can't express it. Always use `.returning()` on inserts. |
| Database | Neon PostgreSQL | Connection via `@neondatabase/serverless` in API. Never connect from Next.js directly. |
| Cache | Upstash Redis | Use for: cart, soft reservations, sessions, rate limiting, ATP cache. |
| Auth | Clerk | Customers use `<UserButton>`. Staff use separate org. NEVER skip auth middleware. |
| File Storage | Cloudflare R2 | Product images go to public bucket. (Prescriptions deferred.) |
| Payments | Manual only (for now) | Zelle, Venmo, CashApp, wire transfer. Staff confirms payment in admin. NO payment gateway SDK. |
| Email | Resend | All emails use React Email templates in `apps/web/emails/`. |
| SMS | Twilio | All SMS goes through Twilio. No other SMS provider. |
| Search | PostgreSQL FTS | Use `to_tsvector` + `plainto_tsquery`. |
| Currency | USD only | All prices, amounts, and calculations in US dollars. |
| Locale | US English | No multi-language support needed. |

---

## DATABASE RULES

### Schema location
All schema files live in `packages/db/schema/`. One file per domain:
```
packages/db/schema/
├── products.ts
├── inventory.ts
├── orders.ts
├── customers.ts
├── delivery.ts
├── payments.ts
├── audit.ts
└── settings.ts
```

### Core rules
- **Every table has:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- **Mutable tables also have:** `updated_at TIMESTAMPTZ DEFAULT NOW()`, `deleted_at TIMESTAMPTZ` (soft delete)
- **Never hard delete** any business record. Set `deleted_at = NOW()`.
- **All queries filter** `WHERE deleted_at IS NULL` unless explicitly fetching deleted records.
- **FEFO enforcement:** When selecting batches for fulfillment, always `ORDER BY expiry_date ASC, created_at ASC`.
- **Audit log:** Every state-changing action on orders, inventory, and payments MUST write to `audit_log`.
- **Currency:** All `currency` columns default to `'USD'`.

### Running migrations
```bash
cd packages/db
pnpm drizzle-kit generate   # Generate migration from schema changes
pnpm drizzle-kit migrate    # Apply to database
pnpm drizzle-kit studio     # Open Drizzle Studio (DB GUI)
```

### Connecting to DB
```typescript
// packages/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## API RULES

### Route structure
```
apps/api/src/routes/
├── products.ts          GET /api/products, POST /api/products, etc.
├── inventory.ts
├── orders.ts
├── customers.ts
├── payments.ts
├── delivery.ts
├── settings.ts
├── reports.ts
└── webhooks.ts          Clerk webhooks
```

### Every route file follows this pattern
```typescript
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Public endpoint
router.get('/', async (req, res) => {
  try {
    // logic
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected endpoint
router.post('/', requireAuth, requireRole('inventory_manager'), validate(schema), async (req, res) => {
  // logic
});

export default router;
```

### Response format — ALWAYS use this shape
```typescript
// Success
res.json({ data: result, meta?: { total, page, limit } });

// Error
res.status(4xx|5xx).json({ error: 'Human readable message', code?: 'MACHINE_CODE' });
```

### Validation
Use Zod for all request body and query param validation.
Never trust `req.body` without validating through `validate()` middleware.

---

## AUTHENTICATION & ROLES

### Clerk setup
- `CLERK_SECRET_KEY` is used server-side only
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is used in Next.js frontend
- Webhook at `POST /api/webhooks/clerk` syncs user events to `customers` table

### Staff roles (Clerk org metadata)
```typescript
type StaffRole =
  | 'super_admin'
  | 'pharmacist'
  | 'inventory_manager'
  | 'finance'
  | 'customer_support';
```

### Role permission matrix
```typescript
// apps/api/src/middleware/rbac.ts
export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  super_admin:           ['*'],
  pharmacist:            ['orders.read', 'orders.update', 'products.read'],
  inventory_manager:     ['inventory.*', 'products.*'],
  finance:               ['payments.*', 'orders.read', 'reports.*'],
  customer_support:      ['orders.read', 'customers.read'],
};
```

### Middleware usage
```typescript
// Require any authenticated user
router.get('/', requireAuth, handler);

// Require specific role
router.post('/', requireAuth, requireRole('inventory_manager'), handler);

// Require any of several roles
router.put('/', requireAuth, requireAnyRole(['pharmacist', 'super_admin']), handler);
```

---

## MANUAL PAYMENT FLOW

**Rule:** There is NO integrated payment gateway. All payments are confirmed manually by staff.

### Customer flow
1. Customer places order → status = `pending_payment`
2. Customer sees payment instructions page with business Zelle/Venmo/CashApp/wire details
3. Customer pays externally and optionally uploads proof screenshot
4. Customer clicks "I Have Paid" (optional)

### Staff flow
1. Staff sees order in admin with status `pending_payment`
2. Staff verifies payment was received (checks Zelle/bank/etc.)
3. Staff clicks "Confirm Payment" → enters payment method + reference
4. Order moves to `confirmed` → customer gets SMS + email

### Payment instructions are admin-configurable
Stored in `payment_methods` table:
```typescript
{
  method: 'zelle',
  label: 'Zelle',
  details: 'payments@pharmaflow.com',
  instructions: 'Send to payments@pharmaflow.com and include your order number',
  is_active: true,
  sort_order: 1
}
```

### Payment method types
```typescript
type ManualPaymentMethod = 'zelle' | 'venmo' | 'cashapp' | 'wire_transfer' | 'check' | 'cash';
```

---

## INVENTORY ENGINE — CRITICAL RULES

### FEFO enforcement
When fulfilling any order, ALWAYS use FEFO (First Expiry First Out):

```typescript
// services/inventory.service.ts
export async function allocateBatchesForOrder(
  productId: string,
  quantity: number
): Promise<BatchAllocation[]> {
  const batches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.productId, productId),
        gt(inventoryBatches.quantityOnHand, 0),
        gt(inventoryBatches.expiryDate, addDays(new Date(), 30)), // Min 30 days to expiry
        eq(inventoryBatches.isQuarantined, false)
      )
    )
    .orderBy(asc(inventoryBatches.expiryDate), asc(inventoryBatches.createdAt)); // FEFO

  let remaining = quantity;
  const allocations: BatchAllocation[] = [];

  for (const batch of batches) {
    if (remaining === 0) break;
    const available = batch.quantityOnHand - batch.quantityReserved;
    if (available <= 0) continue;
    const allocate = Math.min(available, remaining);
    allocations.push({ batchId: batch.id, quantity: allocate });
    remaining -= allocate;
  }

  if (remaining > 0) throw new Error('INSUFFICIENT_STOCK');
  return allocations;
}
```

### Stock reservation flow
```
Add to cart → soft reserve (15 min TTL, Redis)
Place order → hard reserve (no expiry)
Staff confirms payment → order confirmed
Cancel or expire → release reservation
```

### Cron jobs (run via node-cron in API)
```typescript
// Every 5 minutes — release expired soft reservations
cron.schedule('*/5 * * * *', releaseExpiredReservations);

// Every 5 minutes — refresh ATP cache
cron.schedule('*/5 * * * *', refreshATPCache);

// Daily at 7am ET — expiry alerts
cron.schedule('0 7 * * *', checkExpiryAlerts);

// Daily at 7:30am ET — low stock alerts
cron.schedule('30 7 * * *', checkLowStockAlerts);
```

---

## DELIVERY ENGINE

### US-based delivery zones
Zones are defined by ZIP code ranges or state groupings:
- **Local** (same metro area) — same-day or next-day delivery
- **Regional** (same state / neighboring states) — 2-3 business days
- **National** (continental US) — 3-7 business days
- **No international shipping** for now

### Zone lookup
Customer's ZIP code → match against `delivery_zones.zip_ranges` or `delivery_zones.states`.
If no match → "Delivery not available to this location."

### Shipping carriers
- USPS, UPS, FedEx
- Tracking URL patterns per carrier:
  - USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}`
  - UPS: `https://www.ups.com/track?tracknum={tracking}`
  - FedEx: `https://www.fedex.com/fedextrack/?trknbr={tracking}`

### Cutoff logic
Default cutoff: 2:00 PM in the customer's timezone (based on delivery address).
- Order placed BEFORE cutoff → dispatch today
- Order placed AFTER cutoff or on weekend/holiday → dispatch next business day

### Delivery estimate response shape
```typescript
{
  "standard": {
    "earliest": "2026-06-25",
    "latest": "2026-06-27",
    "fee": 5.99,
    "free_above": 35.00
  },
  "express": {
    "earliest": "2026-06-24",
    "latest": "2026-06-24",
    "fee": 12.99,
    "available": true
  },
  "pickup": {
    "ready_in_hours": 2,
    "fee": 0
  },
  "cutoff_message": "Order within 2h 14m for today's dispatch"
}
```

---

## US TAX HANDLING

### Rules
- US sales tax varies by **state** and **product type**
- Many states **exempt prescription drugs** from sales tax
- OTC drugs and supplements are taxed in most states
- Some states have no sales tax (OR, MT, NH, DE, AK)

### Tax calculation
Tax is calculated at checkout based on the **delivery address state**:
```typescript
// services/tax.service.ts
async function calculateTax(state: string, items: CartItem[]): Promise<number> {
  const taxRate = await getTaxRate(state, 'otc');
  return items.reduce((sum, item) => sum + (item.price * item.quantity * taxRate), 0);
}
```

### Tax rates table
```typescript
// tax_rates: { state, product_type, rate }
// Example: { state: 'CA', product_type: 'otc', rate: 0.0725 }
// Example: { state: 'OR', product_type: 'otc', rate: 0 }
```

---

## DRUG INTERACTION CHECK

### Two-layer approach
1. **Layer 1:** Query `drug_interactions` table (fast, < 10ms)
2. **Layer 2:** If unknown pairs exist, flag for manual pharmacist review (AI deferred)

### Severity levels shown in cart
```typescript
type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated';

const SEVERITY_UI = {
  minor: { color: 'blue', label: 'Minor interaction', showInCart: false },
  moderate: { color: 'yellow', label: 'Moderate interaction — consult pharmacist', showInCart: true },
  major: { color: 'orange', label: 'Significant interaction — pharmacist review required', showInCart: true },
  contraindicated: { color: 'red', label: 'Do not take together — order blocked', showInCart: true, blocksCheckout: true },
};
```

---

## NOTIFICATION SERVICE

### Channels
- **Email:** Resend (React Email templates)
- **SMS:** Twilio (all US numbers via +1)

### Usage pattern
```typescript
import { notificationService } from '../services/notification.service';

await notificationService.send('order.confirmed', {
  customer: { email, phone, name },
  order: { number: order.orderNumber, total: order.totalAmount },
});
```

### All notification types (current scope)
```
order.pending_payment         (email + SMS — payment instructions)
order.confirmed               (email + SMS — payment received)
order.processing              (email)
order.dispatched              (email + SMS — with tracking number)
order.delivered               (SMS)
order.cancelled               (email + SMS)
payment.confirmed             (email + SMS)
low_stock.alert               (internal — email to inventory manager)
expiry.alert_90               (internal — email)
expiry.alert_60               (internal — email)
expiry.alert_30               (internal — email, urgent)
```

---

## FRONTEND RULES

### Route groups
```
app/(storefront)/        → Public pharmacy storefront (B2C)
app/(admin)/             → Staff back-office (requires auth + staff role)
app/api/                 → Next.js API routes (thin proxy to Express API)
```

### Never call Express API directly from Server Components
Use the API client wrapper:
```typescript
// apps/web/lib/api-client.ts
export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${process.env.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAuthToken()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### Server vs Client Components
- Default to **Server Components** — they fetch data directly and have no JS bundle cost
- Use `'use client'` ONLY for: interactive UI (cart, modals, forms), hooks, browser APIs
- Never use `useState` or `useEffect` for data fetching — use Server Components + `fetch`

### Product pages MUST be SSR with ISR
```typescript
// app/(storefront)/products/[slug]/page.tsx
export const revalidate = 300; // Revalidate every 5 minutes
```

### Availability is always fetched client-side (real-time)
Product page SSR renders everything EXCEPT availability and delivery estimate.
These two are fetched client-side on mount via SWR with 30s refresh.

---

## ORDER LIFECYCLE

```
pending_payment
  ↓ (staff confirms payment)
confirmed
  ↓ (staff starts processing)
processing
  ↓ (staff packs order)
packed
  ↓ (dispatched to carrier — USPS/UPS/FedEx)
dispatched
  ↓ (out for delivery)
out_for_delivery
  ↓
delivered

Any state → cancelled (with reason)
```

### Order number format
```
PF-{YEAR}-{6-digit-sequence}
Example: PF-2026-000047
```

---

## US ADDRESS FORMAT

All customer addresses follow US format:
```typescript
{
  address_line1: string;   // Street address
  address_line2?: string;  // Apt, Suite, Unit
  city: string;
  state: string;           // 2-letter code: CA, NY, TX
  zip_code: string;        // 5-digit or ZIP+4: 90210 or 90210-1234
  country: 'US';           // Always US for now
}
```

---

## US PHARMACY COMPLIANCE DISPLAY

- **"Licensed Pharmacy"** badge with state license number in footer
- **Pharmacist on file** name displayed in footer
- **FDA disclaimer** on supplement product pages:
  *"These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."*
- **Rx products** display "Prescription Required — Contact Us" badge (not purchasable online yet)
- **NDC Number** (National Drug Code) displayed on product detail pages — stored in `products.ndc_number`

---

## ENVIRONMENT VARIABLES REFERENCE

**API (`apps/api/.env`):**
```
DATABASE_URL
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_PRODUCTS
RESEND_API_KEY
RESEND_FROM_EMAIL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
API_URL
NODE_ENV
```

**Web (`apps/web/.env.local`):**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
API_URL
```

---

## WHAT NOT TO DO

- Never write raw SQL when Drizzle can express it
- Never hard delete any record — always soft delete via `deleted_at`
- Never expose `CLERK_SECRET_KEY` or any secret keys in the frontend
- Never select batches for fulfillment without FEFO ordering
- Never skip writing to `audit_log` on state changes to orders and inventory
- Never skip the drug interaction check at checkout
- Never trust unvalidated `req.body` — always run through Zod schema
- Never use `useEffect` for data fetching — use Server Components or SWR
- Never write customer data (PII) to console logs
- Never allow an Rx-required product to be added to cart (until prescription module is built)

---

## WHAT TO DO FIRST WHEN STARTING A NEW FEATURE

1. Check this file and `PHARMAFLOW_PLAN.md` for the relevant spec
2. Check if DB schema changes are needed → update `packages/db/schema/` → run migration
3. Write the service layer first (`apps/api/src/services/`)
4. Write the route (`apps/api/src/routes/`) using the service
5. Write the frontend page/component last
6. Update `audit_log` writes if the feature changes any critical state
7. Update `notification.service.ts` if the feature should trigger notifications

---

## PHASE STATUS TRACKER

- [ ] **Phase 1** — Foundation + B2C Storefront + Manual Payment + Order Tracking
- [ ] **Phase 2** — Prescription Module (upload, OCR, pharmacist review)
- [ ] **Phase 3** — Inventory & Procurement (POs, GRNs, stocktake)
- [ ] **Phase 4** — B2B Wholesale Portal (tiered pricing, invoicing, credit)
- [ ] **Phase 5** — Integrated Payments (Stripe, etc.)
- [ ] **Phase 6** — AI Features (interactions via Claude, chatbot, demand forecast)
- [ ] **Phase 7** — Subscriptions & Retention (auto-refill, loyalty, promos)
- [ ] **Phase 8** — Advanced (teleconsult, anti-counterfeit, GDPR)
- [ ] **Phase 9** — Intelligence & Polish (BI dashboard, compliance reports, SEO, perf)

---

*CLAUDE.md — PharmaFlow v1.1 (US Market)*
*Stack: Next.js 14 · Node/Express · Drizzle ORM · Neon PostgreSQL · Clerk · Cloudflare R2*
*Payments: Manual (Zelle, Venmo, CashApp, Wire)*
*Notifications: Resend (email) · Twilio (SMS)*
*Currency: USD only · Locale: US English*
