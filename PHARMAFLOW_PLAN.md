# PHARMAFLOW_PLAN.md
# Pharmaceutical Platform & Ecommerce — Complete Technical Specification
# Version 1.0 | Single-Tenant | Africa + International

---

## TABLE OF CONTENTS

1. [Product Vision & Goals](#1-product-vision--goals)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Database Schema](#5-database-schema)
6. [Module 1 — B2C Ecommerce Storefront](#6-module-1--b2c-ecommerce-storefront)
7. [Module 2 — B2B Wholesale Portal](#7-module-2--b2b-wholesale-portal)
8. [Module 3 — Inventory & Procurement](#8-module-3--inventory--procurement)
9. [Module 4 — Prescription Management](#9-module-4--prescription-management)
10. [Module 5 — Availability & Delivery Engine](#10-module-5--availability--delivery-engine)
11. [Module 6 — Payments & Financials](#11-module-6--payments--financials)
12. [Module 7 — AI Features](#12-module-7--ai-features)
13. [Module 8 — Subscriptions & Recurring Orders](#13-module-8--subscriptions--recurring-orders)
14. [Module 9 — Teleconsultation & Doctor Network](#14-module-9--teleconsultation--doctor-network)
15. [Module 10 — Marketing & Retention Engine](#15-module-10--marketing--retention-engine)
16. [Module 11 — Staff Back-Office & Admin](#16-module-11--staff-back-office--admin)
17. [Module 12 — Business Intelligence & Reports](#17-module-12--business-intelligence--reports)
18. [Module 13 — Compliance & Trust Infrastructure](#18-module-13--compliance--trust-infrastructure)
19. [Module 14 — Supplier Intelligence](#19-module-14--supplier-intelligence)
20. [API Reference](#20-api-reference)
21. [Authentication & Authorization](#21-authentication--authorization)
22. [Payment Provider Abstraction](#22-payment-provider-abstraction)
23. [Notification System](#23-notification-system)
24. [File Storage & Media](#24-file-storage--media)
25. [Environment Variables](#25-environment-variables)
26. [Phase-by-Phase Build Plan](#26-phase-by-phase-build-plan)
27. [Non-Functional Requirements](#27-non-functional-requirements)
28. [Open Questions & Future Scope](#28-open-questions--future-scope)

---

## 1. PRODUCT VISION & GOALS

### 1.1 What PharmaFlow Is

PharmaFlow is a single-tenant, full-stack pharmaceutical platform combining:

- **B2C Ecommerce Storefront** — Individual consumers (patients) browse, order OTC and prescription drugs online
- **B2B Wholesale Portal** — Licensed pharmacies, clinics, and resellers order in bulk with tiered pricing and credit terms
- **Operational Back-Office** — Staff manage inventory, prescriptions, procurement, logistics, and financials
- **AI-Powered Intelligence** — Drug interaction checking, prescription OCR, demand forecasting, virtual pharmacist chatbot
- **Delivery Intelligence Engine** — Real-time availability, ATP (Available to Promise), estimated delivery dates by zone
- **Subscription Engine** — Chronic medication auto-refills, wellness boxes, B2B standing orders

### 1.2 Business Goals

- Generate online revenue from both retail (B2C) and wholesale (B2B) channels
- Reduce manual pharmacist workload through automation and AI
- Achieve regulatory compliance in Cameroon (MINSANTE) and international markets
- Build patient trust through verified authenticity, drug safety, and transparent delivery
- Unlock recurring revenue through subscriptions, BNPL, and insurance integration

### 1.3 Key Differentiators

- Real-time inventory availability with zone-aware delivery time estimation (Alibaba-style)
- Prescription OCR using Claude API — automated script reading, zero manual data entry
- Drug interaction checker integrated directly into checkout flow
- Chronic medication subscription engine with auto-refill and SMS reminders
- Full controlled substances register — audit-ready at all times
- Anti-counterfeit verification via mPedigree/Sproxil integration
- Available to Promise (ATP) for B2B wholesale clients

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Next.js 14 App (B2C Storefront + B2B Portal + Admin)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS REST
┌──────────────────────────▼──────────────────────────────────┐
│                      API LAYER                               │
│              Node.js + Express REST API                      │
│   Auth │ Products │ Orders │ Inventory │ Payments │ AI       │
└──┬─────┬──────────┬────────┬───────────┬──────────┬─────────┘
   │     │          │        │           │          │
  Clerk  Neon    Upstash   AWS S3    Payments     Claude
  Auth  Postgres  Redis    / R2      Providers    API
                              │
              ┌───────────────┼───────────────┐
         Flutterwave      Paystack          Stripe
         (Africa)         (Africa)      (International)
                              │
              ┌───────────────┼───────────────┐
           Resend          Twilio       Africa's Talking
           (Email)         (SMS)            (SMS)
```

### 2.1 Architectural Principles

- **Separation of concerns** — Frontend, API, and DB are independently deployable
- **Provider abstraction** — Payment, SMS, and storage providers are swappable via adapter pattern
- **FIFO/FEFO enforcement** — All stock movements enforce First Expiry First Out at the DB level
- **Soft delete everywhere** — Nothing is hard deleted; all records have `deleted_at`
- **Audit trail** — Every state-changing action logged with actor, timestamp, and before/after snapshot
- **Optimistic UI** — Cart and availability updates are optimistic with server reconciliation

---

## 3. TECH STACK

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | Next.js | 14 (App Router) | SSR, SEO, routing |
| UI Library | shadcn/ui + Tailwind CSS | Latest | Component system |
| Backend Framework | Node.js + Express | 20 LTS | REST API |
| ORM | Drizzle ORM | Latest | Type-safe DB access |
| Database | Neon PostgreSQL | Latest | Primary data store |
| Cache / Queue | Upstash Redis | Latest | Sessions, cart, rate limiting |
| Auth | Clerk | Latest | Staff + customer auth, RBAC |
| File Storage | Cloudflare R2 | — | Prescriptions, product images |
| Email | Resend | Latest | Transactional email |
| SMS (Africa) | Africa's Talking | Latest | OTP, order alerts |
| SMS (International) | Twilio | Latest | International SMS |
| Payments (Africa) | Flutterwave + Paystack | Latest | Card + mobile money |
| Payments (International) | Stripe | Latest | USD/EUR card payments |
| AI | Claude API (claude-sonnet-4-6) | Latest | OCR, chatbot, interaction check |
| Search | PostgreSQL FTS → Algolia | — | Drug name / ingredient search |
| Drug Auth | mPedigree / Sproxil | API | Anti-counterfeit verification |
| Deployment (Frontend) | Vercel | — | Edge CDN, auto-deploy |
| Deployment (API) | Railway | — | Node.js server hosting |
| Monitoring | Sentry | Latest | Error tracking |
| Analytics | PostHog | Latest | Product analytics |

---

## 4. MONOREPO STRUCTURE

```
pharmaflow/
├── apps/
│   ├── web/                          # Next.js 14 — Storefront + Admin + B2B Portal
│   │   ├── app/
│   │   │   ├── (storefront)/         # B2C public routes
│   │   │   │   ├── page.tsx          # Homepage
│   │   │   │   ├── products/
│   │   │   │   │   ├── page.tsx      # Product listing
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx  # Product detail
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   ├── prescriptions/
│   │   │   │   ├── account/
│   │   │   │   └── track/[orderId]/
│   │   │   ├── (wholesale)/          # B2B portal routes (auth-gated)
│   │   │   │   ├── portal/
│   │   │   │   │   ├── page.tsx      # B2B dashboard
│   │   │   │   │   ├── products/
│   │   │   │   │   ├── orders/
│   │   │   │   │   ├── invoices/
│   │   │   │   │   └── standing-orders/
│   │   │   ├── (admin)/              # Staff back-office (auth-gated, role-checked)
│   │   │   │   ├── admin/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── products/
│   │   │   │   │   ├── inventory/
│   │   │   │   │   ├── orders/
│   │   │   │   │   ├── prescriptions/
│   │   │   │   │   ├── customers/
│   │   │   │   │   ├── suppliers/
│   │   │   │   │   ├── purchase-orders/
│   │   │   │   │   ├── reports/
│   │   │   │   │   └── settings/
│   │   │   └── api/                  # Next.js API routes (thin proxy to Express)
│   │   ├── components/
│   │   │   ├── storefront/
│   │   │   ├── wholesale/
│   │   │   ├── admin/
│   │   │   └── shared/
│   │   └── lib/
│   │       ├── api-client.ts
│   │       └── hooks/
│   └── api/                          # Express REST API
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── products.ts
│       │   │   ├── inventory.ts
│       │   │   ├── orders.ts
│       │   │   ├── prescriptions.ts
│       │   │   ├── customers.ts
│       │   │   ├── wholesale.ts
│       │   │   ├── payments.ts
│       │   │   ├── suppliers.ts
│       │   │   ├── purchase-orders.ts
│       │   │   ├── delivery.ts
│       │   │   ├── subscriptions.ts
│       │   │   ├── ai.ts
│       │   │   ├── reports.ts
│       │   │   └── webhooks.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rbac.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── validate.ts
│       │   ├── services/
│       │   │   ├── inventory.service.ts
│       │   │   ├── order.service.ts
│       │   │   ├── payment.service.ts
│       │   │   ├── delivery.service.ts
│       │   │   ├── prescription.service.ts
│       │   │   ├── notification.service.ts
│       │   │   ├── ai.service.ts
│       │   │   └── subscription.service.ts
│       │   └── lib/
│       │       ├── db.ts
│       │       ├── redis.ts
│       │       ├── storage.ts
│       │       └── payments/
│       │           ├── index.ts      # Provider abstraction
│       │           ├── flutterwave.ts
│       │           ├── paystack.ts
│       │           └── stripe.ts
├── packages/
│   ├── db/                           # Drizzle schema + migrations
│   │   ├── schema/
│   │   │   ├── products.ts
│   │   │   ├── inventory.ts
│   │   │   ├── orders.ts
│   │   │   ├── customers.ts
│   │   │   ├── prescriptions.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── delivery.ts
│   │   │   ├── payments.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── audit.ts
│   │   ├── migrations/
│   │   └── index.ts
│   ├── types/                        # Shared TypeScript types
│   │   └── index.ts
│   └── utils/                        # Shared utilities
│       └── index.ts
├── turbo.json
├── package.json
└── .env.example
```

---

## 5. DATABASE SCHEMA

### 5.1 Products

```sql
-- Product categories
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  parent_id   UUID REFERENCES product_categories(id),
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Master product catalog
CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255) NOT NULL,
  slug                    VARCHAR(255) UNIQUE NOT NULL,
  generic_name            VARCHAR(255),
  brand_name              VARCHAR(255),
  category_id             UUID REFERENCES product_categories(id),
  description             TEXT,
  short_description       VARCHAR(500),
  active_ingredients      JSONB,          -- [{name, strength, unit}]
  dosage_form             VARCHAR(100),   -- tablet, capsule, syrup, injection
  strength                VARCHAR(100),   -- e.g. 500mg, 250mg/5ml
  pack_size               VARCHAR(100),   -- e.g. 30 tablets, 100ml
  manufacturer            VARCHAR(255),
  country_of_origin       VARCHAR(100),
  registration_number     VARCHAR(100),   -- National drug registration number
  requires_prescription   BOOLEAN DEFAULT FALSE,
  is_controlled_substance BOOLEAN DEFAULT FALSE,
  controlled_class        VARCHAR(50),    -- Schedule I, II, III etc.
  storage_conditions      VARCHAR(255),   -- e.g. Store below 25°C, away from light
  requires_cold_chain     BOOLEAN DEFAULT FALSE,
  min_temperature_c       DECIMAL(4,1),
  max_temperature_c       DECIMAL(4,1),
  images                  JSONB,          -- [{url, alt, is_primary}]
  tags                    TEXT[],
  is_b2c_visible          BOOLEAN DEFAULT TRUE,
  is_b2b_visible          BOOLEAN DEFAULT TRUE,
  is_active               BOOLEAN DEFAULT TRUE,
  meta_title              VARCHAR(255),
  meta_description        VARCHAR(500),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

-- Product pricing (B2C and B2B tiers)
CREATE TABLE product_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) NOT NULL,
  price_type      VARCHAR(20) NOT NULL, -- b2c, b2b_tier1, b2b_tier2, b2b_tier3
  currency        VARCHAR(3) DEFAULT 'XAF',
  amount          DECIMAL(12,2) NOT NULL,
  moq             INT DEFAULT 1,        -- Minimum order quantity
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Drug interactions reference data
CREATE TABLE drug_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a          VARCHAR(255) NOT NULL, -- generic name
  drug_b          VARCHAR(255) NOT NULL,
  severity        VARCHAR(20) NOT NULL,  -- minor, moderate, major, contraindicated
  description     TEXT NOT NULL,
  recommendation  TEXT,
  source          VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Product reviews
CREATE TABLE product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) NOT NULL,
  customer_id     UUID REFERENCES customers(id) NOT NULL,
  order_id        UUID REFERENCES orders(id),
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(255),
  body            TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_published    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Inventory

```sql
-- Inventory batches (batch-level stock tracking)
CREATE TABLE inventory_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id) NOT NULL,
  batch_number      VARCHAR(100) NOT NULL,
  expiry_date       DATE NOT NULL,
  manufacture_date  DATE,
  quantity_received INT NOT NULL,
  quantity_on_hand  INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  cost_price        DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(3) DEFAULT 'XAF',
  supplier_id       UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  location          VARCHAR(100),         -- Shelf/bin location in warehouse
  cold_chain_log    JSONB,               -- [{timestamp, temp_c, location}]
  coa_url           TEXT,                -- Certificate of Analysis URL
  is_quarantined    BOOLEAN DEFAULT FALSE,
  quarantine_reason TEXT,
  received_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, batch_number)
);

-- Stock movements (every movement logged)
CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) NOT NULL,
  batch_id        UUID REFERENCES inventory_batches(id) NOT NULL,
  movement_type   VARCHAR(50) NOT NULL, -- received, sold, returned, adjusted, expired, transferred, reserved, unreserved
  quantity        INT NOT NULL,         -- positive = in, negative = out
  reference_type  VARCHAR(50),          -- order, purchase_order, adjustment, stocktake
  reference_id    UUID,
  reason          TEXT,
  actor_id        VARCHAR(255),         -- Clerk user ID
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stock reservations (cart and order holds)
CREATE TABLE stock_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) NOT NULL,
  batch_id        UUID REFERENCES inventory_batches(id) NOT NULL,
  quantity        INT NOT NULL,
  reservation_type VARCHAR(20) DEFAULT 'soft', -- soft (cart), hard (order)
  reference_type  VARCHAR(50),          -- cart, order
  reference_id    UUID NOT NULL,
  expires_at      TIMESTAMPTZ,          -- NULL for hard reservations
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reorder rules
CREATE TABLE reorder_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id) UNIQUE NOT NULL,
  reorder_point     INT NOT NULL,        -- trigger reorder when stock <= this
  reorder_quantity  INT NOT NULL,        -- suggested PO quantity
  preferred_supplier_id UUID REFERENCES suppliers(id),
  is_auto_reorder   BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Stocktakes
CREATE TABLE stocktakes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(50) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft', -- draft, in_progress, completed
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  performed_by    VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stocktake_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id    UUID REFERENCES stocktakes(id) NOT NULL,
  product_id      UUID REFERENCES products(id) NOT NULL,
  batch_id        UUID REFERENCES inventory_batches(id) NOT NULL,
  system_qty      INT NOT NULL,
  counted_qty     INT,
  variance        INT GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  notes           TEXT
);
```

### 5.3 Customers

```sql
-- Customers (both B2C individuals and B2B businesses)
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id       VARCHAR(255) UNIQUE,
  customer_type       VARCHAR(20) NOT NULL DEFAULT 'individual', -- individual, business
  first_name          VARCHAR(100),
  last_name           VARCHAR(100),
  business_name       VARCHAR(255),
  email               VARCHAR(255) UNIQUE NOT NULL,
  phone               VARCHAR(50),
  date_of_birth       DATE,
  gender              VARCHAR(20),
  -- B2B specific
  business_reg_number VARCHAR(100),
  pharmacy_license    VARCHAR(100),
  license_expiry      DATE,
  license_doc_url     TEXT,
  tax_id              VARCHAR(100),
  credit_limit        DECIMAL(12,2) DEFAULT 0,
  credit_used         DECIMAL(12,2) DEFAULT 0,
  payment_terms_days  INT DEFAULT 0,       -- 0 = prepay, 15/30/60 = net terms
  assigned_rep_id     VARCHAR(255),
  b2b_tier            VARCHAR(20),         -- tier1, tier2, tier3
  -- Loyalty
  loyalty_points      INT DEFAULT 0,
  loyalty_tier        VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold
  -- Compliance
  id_type             VARCHAR(50),         -- national_id, passport, drivers_license
  id_number           VARCHAR(100),
  id_verified_at      TIMESTAMPTZ,
  -- Consent
  gdpr_consent        BOOLEAN DEFAULT FALSE,
  marketing_consent   BOOLEAN DEFAULT FALSE,
  -- Status
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

-- Customer delivery addresses
CREATE TABLE customer_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) NOT NULL,
  label           VARCHAR(100),          -- Home, Office, Clinic
  recipient_name  VARCHAR(255),
  phone           VARCHAR(50),
  address_line1   VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  city            VARCHAR(100) NOT NULL,
  region          VARCHAR(100),
  country         VARCHAR(100) NOT NULL DEFAULT 'CM',
  postal_code     VARCHAR(20),
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Saved prescriptions per customer
CREATE TABLE customer_prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) NOT NULL,
  file_url        TEXT NOT NULL,
  ocr_data        JSONB,               -- AI-extracted data
  issuing_doctor  VARCHAR(255),
  clinic_name     VARCHAR(255),
  issued_date     DATE,
  valid_until     DATE,
  status          VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
  reviewed_by     VARCHAR(255),        -- Pharmacist Clerk ID
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Orders

```sql
-- Orders (B2C and B2B)
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          VARCHAR(50) UNIQUE NOT NULL, -- PF-2024-000001
  customer_id           UUID REFERENCES customers(id) NOT NULL,
  order_type            VARCHAR(20) NOT NULL,  -- b2c, b2b
  channel               VARCHAR(20) DEFAULT 'web', -- web, phone, walk_in
  status                VARCHAR(30) DEFAULT 'pending',
  -- pending | confirmed | prescription_review | processing | packed | dispatched | out_for_delivery | delivered | cancelled | refunded
  prescription_id       UUID REFERENCES customer_prescriptions(id),
  -- Delivery
  delivery_method       VARCHAR(30),            -- standard, express, pickup, cold_chain
  delivery_address_id   UUID REFERENCES customer_addresses(id),
  delivery_zone_id      UUID REFERENCES delivery_zones(id),
  estimated_delivery    DATE,
  delivered_at          TIMESTAMPTZ,
  delivery_notes        TEXT,
  tracking_number       VARCHAR(100),
  courier_name          VARCHAR(100),
  -- Pricing
  currency              VARCHAR(3) DEFAULT 'XAF',
  subtotal              DECIMAL(12,2) NOT NULL,
  delivery_fee          DECIMAL(12,2) DEFAULT 0,
  discount_amount       DECIMAL(12,2) DEFAULT 0,
  tax_amount            DECIMAL(12,2) DEFAULT 0,
  total_amount          DECIMAL(12,2) NOT NULL,
  -- B2B specific
  po_number             VARCHAR(100),
  payment_terms_days    INT DEFAULT 0,
  due_date              DATE,
  invoice_url           TEXT,
  -- Payment
  payment_status        VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid, refunded
  payment_method        VARCHAR(50),
  -- Meta
  notes                 TEXT,
  internal_notes        TEXT,
  processed_by          VARCHAR(255),           -- Staff Clerk ID
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT
);

-- Order line items
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) NOT NULL,
  product_id      UUID REFERENCES products(id) NOT NULL,
  batch_id        UUID REFERENCES inventory_batches(id),
  product_name    VARCHAR(255) NOT NULL,  -- Snapshot at time of order
  quantity        INT NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL,
  cost_price      DECIMAL(12,2),          -- For margin tracking
  discount        DECIMAL(12,2) DEFAULT 0,
  total_price     DECIMAL(12,2) NOT NULL,
  dispensed_by    VARCHAR(255),           -- Pharmacist Clerk ID
  dispensed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Order status history
CREATE TABLE order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) NOT NULL,
  from_status     VARCHAR(30),
  to_status       VARCHAR(30) NOT NULL,
  note            TEXT,
  actor_id        VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Dispensing log (regulatory requirement)
CREATE TABLE dispensing_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) NOT NULL,
  order_item_id     UUID REFERENCES order_items(id) NOT NULL,
  product_id        UUID REFERENCES products(id) NOT NULL,
  batch_id          UUID REFERENCES inventory_batches(id) NOT NULL,
  batch_number      VARCHAR(100) NOT NULL,
  quantity          INT NOT NULL,
  customer_id       UUID REFERENCES customers(id) NOT NULL,
  prescription_id   UUID REFERENCES customer_prescriptions(id),
  dispensed_by      VARCHAR(255) NOT NULL,  -- Licensed pharmacist Clerk ID
  dispensed_at      TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT
);

-- Controlled substances register (narc ledger)
CREATE TABLE controlled_substance_register (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id) NOT NULL,
  batch_id          UUID REFERENCES inventory_batches(id) NOT NULL,
  transaction_type  VARCHAR(20) NOT NULL, -- received, dispensed, destroyed, transferred
  quantity          INT NOT NULL,
  running_balance   INT NOT NULL,
  reference_type    VARCHAR(50),          -- order, purchase_order, destruction
  reference_id      UUID,
  customer_id       UUID REFERENCES customers(id),
  prescription_id   UUID REFERENCES customer_prescriptions(id),
  pharmacist_id     VARCHAR(255) NOT NULL,
  witness_id        VARCHAR(255),         -- Required for destruction
  recorded_at       TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT
);
```

### 5.5 Delivery & Availability

```sql
-- Delivery zones
CREATE TABLE delivery_zones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  countries             TEXT[] NOT NULL,      -- ['CM', 'NG', 'GH']
  regions               TEXT[],               -- Sub-national regions
  cities                TEXT[],
  standard_days_min     INT NOT NULL,
  standard_days_max     INT NOT NULL,
  express_days          INT,                  -- NULL if express not available
  standard_fee          DECIMAL(10,2) DEFAULT 0,
  express_fee           DECIMAL(10,2),
  free_delivery_above   DECIMAL(12,2),
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Order cutoff rules
CREATE TABLE cutoff_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100),
  applies_to        VARCHAR(20) DEFAULT 'all',  -- all, b2c, b2b
  cutoff_hour       INT NOT NULL,               -- 14 = 2pm
  cutoff_timezone   VARCHAR(50) DEFAULT 'Africa/Douala',
  processing_days   INT DEFAULT 1,
  excludes_weekends BOOLEAN DEFAULT TRUE,
  excludes_holidays BOOLEAN DEFAULT TRUE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Public holidays (per country)
CREATE TABLE public_holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country     VARCHAR(3) NOT NULL,
  date        DATE NOT NULL,
  name        VARCHAR(100),
  UNIQUE(country, date)
);

-- ATP (Available to Promise) cache — refreshed every 5 minutes
CREATE TABLE atp_cache (
  product_id    UUID REFERENCES products(id) PRIMARY KEY,
  qty_on_hand   INT NOT NULL,
  qty_reserved  INT NOT NULL,
  qty_available INT GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  next_restock  DATE,
  next_qty      INT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 Suppliers & Purchase Orders

```sql
-- Suppliers
CREATE TABLE suppliers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  contact_name      VARCHAR(255),
  email             VARCHAR(255),
  phone             VARCHAR(50),
  country           VARCHAR(100),
  address           TEXT,
  payment_terms_days INT DEFAULT 30,
  avg_lead_days     INT DEFAULT 14,
  currency          VARCHAR(3) DEFAULT 'XAF',
  rating            DECIMAL(3,2),             -- 0.00 - 5.00, computed
  on_time_pct       DECIMAL(5,2),
  rejection_pct     DECIMAL(5,2),
  notes             TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier product catalogue (which supplier carries which products)
CREATE TABLE supplier_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       UUID REFERENCES suppliers(id) NOT NULL,
  product_id        UUID REFERENCES products(id) NOT NULL,
  supplier_sku      VARCHAR(100),
  unit_cost         DECIMAL(12,2),
  currency          VARCHAR(3) DEFAULT 'XAF',
  moq               INT DEFAULT 1,
  lead_days         INT,
  is_preferred      BOOLEAN DEFAULT FALSE,
  last_ordered_at   TIMESTAMPTZ,
  UNIQUE(supplier_id, product_id)
);

-- Purchase orders
CREATE TABLE purchase_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number         VARCHAR(50) UNIQUE NOT NULL, -- PO-2024-000001
  supplier_id       UUID REFERENCES suppliers(id) NOT NULL,
  status            VARCHAR(30) DEFAULT 'draft',
  -- draft | sent | acknowledged | partially_received | received | cancelled
  currency          VARCHAR(3) DEFAULT 'XAF',
  subtotal          DECIMAL(12,2),
  tax_amount        DECIMAL(12,2) DEFAULT 0,
  total_amount      DECIMAL(12,2),
  expected_delivery DATE,
  actual_delivery   DATE,
  payment_terms_days INT,
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_by        VARCHAR(255),
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID REFERENCES purchase_orders(id) NOT NULL,
  product_id        UUID REFERENCES products(id) NOT NULL,
  quantity_ordered  INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost         DECIMAL(12,2) NOT NULL,
  total_cost        DECIMAL(12,2) NOT NULL,
  notes             TEXT
);

-- Goods received notes
CREATE TABLE goods_received_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number      VARCHAR(50) UNIQUE NOT NULL,
  po_id           UUID REFERENCES purchase_orders(id),
  supplier_id     UUID REFERENCES suppliers(id) NOT NULL,
  received_by     VARCHAR(255) NOT NULL,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT
);

CREATE TABLE grn_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id          UUID REFERENCES goods_received_notes(id) NOT NULL,
  po_item_id      UUID REFERENCES purchase_order_items(id),
  product_id      UUID REFERENCES products(id) NOT NULL,
  batch_id        UUID REFERENCES inventory_batches(id),
  quantity        INT NOT NULL,
  accepted        INT NOT NULL,
  rejected        INT DEFAULT 0,
  rejection_reason TEXT
);
```

### 5.7 Payments

```sql
-- Payments
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) NOT NULL,
  customer_id       UUID REFERENCES customers(id) NOT NULL,
  provider          VARCHAR(30) NOT NULL,  -- flutterwave, paystack, stripe, mobile_money, cash, bank_transfer
  provider_ref      VARCHAR(255),          -- Provider transaction reference
  amount            DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(3) NOT NULL,
  exchange_rate     DECIMAL(10,6),         -- Rate to XAF if foreign currency
  status            VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, refunded
  payment_method    VARCHAR(50),           -- card, momo_mtn, momo_orange, wave, bank_transfer
  phone_number      VARCHAR(50),           -- For mobile money
  failure_reason    TEXT,
  webhook_data      JSONB,                 -- Raw provider webhook payload
  initiated_at      TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  refund_reason     TEXT
);

-- B2B credit notes
CREATE TABLE credit_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) NOT NULL,
  order_id        UUID REFERENCES orders(id),
  amount          DECIMAL(12,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'XAF',
  reason          TEXT,
  issued_by       VARCHAR(255),
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  applied_at      TIMESTAMPTZ,
  applied_to_order_id UUID REFERENCES orders(id)
);
```

### 5.8 Subscriptions

```sql
-- Subscription plans (chronic meds, wellness boxes)
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  plan_type       VARCHAR(30),         -- medication, wellness_box, standing_order
  description     TEXT,
  billing_cycle   VARCHAR(20),         -- weekly, monthly, quarterly
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Customer subscriptions
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID REFERENCES customers(id) NOT NULL,
  plan_id               UUID REFERENCES subscription_plans(id),
  status                VARCHAR(20) DEFAULT 'active', -- active, paused, cancelled
  delivery_address_id   UUID REFERENCES customer_addresses(id),
  billing_cycle         VARCHAR(20),
  next_order_date       DATE,
  last_order_id         UUID REFERENCES orders(id),
  payment_method        VARCHAR(50),
  payment_token         TEXT,                -- Stored card/mobile money token
  notes                 TEXT,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  paused_at             TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription items (what gets ordered each cycle)
CREATE TABLE subscription_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES subscriptions(id) NOT NULL,
  product_id        UUID REFERENCES products(id) NOT NULL,
  quantity          INT NOT NULL,
  unit_price        DECIMAL(12,2)
);

-- Subscription order history
CREATE TABLE subscription_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES subscriptions(id) NOT NULL,
  order_id          UUID REFERENCES orders(id) NOT NULL,
  cycle_date        DATE NOT NULL,
  status            VARCHAR(20),         -- success, failed, skipped
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.9 Audit

```sql
-- Audit log for all critical actions
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  actor_id        VARCHAR(255),            -- Clerk user ID
  actor_type      VARCHAR(20),             -- staff, customer, system
  action          VARCHAR(100) NOT NULL,   -- e.g. order.status_changed
  entity_type     VARCHAR(50),             -- order, product, prescription
  entity_id       UUID,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      VARCHAR(50),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. MODULE 1 — B2C ECOMMERCE STOREFRONT

### 6.1 Homepage

**Sections:**
- Hero banner with CTAs (Shop Now, Upload Prescription)
- Featured categories (OTC, Vitamins, Personal Care, Medical Devices)
- Flash sale / promotions strip with countdown timer
- Featured products carousel
- Chronic medication subscription CTA
- Trust badges (Licensed Pharmacist, Authentic Drugs, Fast Delivery, 24/7 Chat)
- Testimonials / reviews

### 6.2 Product Listing Page

**URL:** `/products?category=&search=&brand=&price_min=&price_max=&in_stock=true&page=1`

**Features:**
- Full-text search across name, generic name, brand, active ingredients
- Filter sidebar: category, brand, price range, availability, prescription required, dosage form
- Sort: relevance, price asc/desc, newest, best seller, expiry date (soonest)
- Product cards showing: name, strength, pack size, price, availability badge, delivery estimate
- Pagination (20 per page) + infinite scroll option

### 6.3 Product Detail Page

**URL:** `/products/[slug]`

**Sections:**

**Above fold:**
- Product images (primary + gallery)
- Name, generic name, brand, strength, pack size
- Price (B2C), availability status badge
- Delivery estimate widget — customer inputs city, sees options and dates
- "Add to Cart" / "Upload Prescription to Order"
- Quantity selector (respects max per order for controlled substances)

**Below fold:**
- Description, indications, active ingredients
- Dosage & usage instructions
- Side effects & precautions
- Drug interactions warning (pulls from drug_interactions table)
- Storage conditions
- Manufacturer details
- Authenticity verification widget (mPedigree/Sproxil code entry)
- Reviews & ratings
- Related products (same generic, complementary products)

### 6.4 Cart & Checkout

**Cart:**
- Persistent cart (Redis, 30-day TTL)
- Soft stock reservation on add-to-cart (15-min TTL)
- Drug interaction check on cart update (cross-checks all products in cart)
- Prescription gate — items requiring Rx are flagged, user prompted to upload
- Loyalty points balance shown, apply-to-order option

**Checkout Flow:**
1. Review cart + interaction warnings
2. Select/add delivery address
3. Choose delivery method (standard/express/pickup)
4. See delivery date estimate per item
5. Apply promo code / loyalty points
6. Select payment method
7. Pay
8. Order confirmation page + email + SMS

### 6.5 Customer Account

**Pages:**
- `/account/orders` — Order history with status and tracking
- `/account/prescriptions` — Saved prescriptions, upload new, view status
- `/account/subscriptions` — Active subscriptions, manage, pause, cancel
- `/account/addresses` — Manage delivery addresses
- `/account/loyalty` — Points balance, tier, history, how to earn
- `/account/notifications` — Preferences for email/SMS
- `/account/profile` — Personal info, password, ID verification

---

## 7. MODULE 2 — B2B WHOLESALE PORTAL

### 7.1 Access & Onboarding

- Separate authenticated section at `/portal`
- B2B registration requires: business name, pharmacy license number, tax ID, contact info
- License document upload (verified manually by admin within 24h)
- Once approved, customer_type upgraded to `business`, b2b_tier assigned
- Dedicated account manager assigned

### 7.2 B2B Product Catalog

- Shows wholesale prices based on customer's b2b_tier
- Minimum order quantity (MOQ) enforced per product
- Shows available quantity at wholesale tier
- Bulk CSV ordering — customer uploads CSV with SKU + quantity, system validates and builds order
- Backorder option — order beyond current stock, fulfilled on next restock
- "Last ordered" indicator per product
- Standing order templates — save a recurring order configuration

### 7.3 B2B Order Management

- PO number field — customer enters their internal PO number for reconciliation
- Split shipment options for large orders
- Order confirmation generates proforma invoice PDF immediately
- Payment: immediate pay OR net terms (if credit limit allows)
- Credit limit display: Total Limit | Used | Available
- Order history with downloadable invoices per order

### 7.4 B2B Invoicing & Credit

- Net 15/30/60 day terms per customer
- Invoice PDF auto-generated (company letterhead, line items, tax breakdown, payment details)
- Overdue invoice alerts (email + SMS) at Day 0, Day 5, Day 14
- Late payment fee calculation
- Credit note issuance for returns
- Statement of account — downloadable PDF showing all transactions in a period

### 7.5 ATP Display for B2B

On the product page, B2B customers see:

```
Available Now:      1,200 units
Your Allocation:    —
Next Restock:       ~Feb 3 (est. 5,000 units)

Order 1,000+ units? We can fulfill:
  • 1,200 units by Jan 22
  • Remaining 800 units by Feb 5
  
[Request ATP Confirmation] [Place Order]
```

---

## 8. MODULE 3 — INVENTORY & PROCUREMENT

### 8.1 Inventory Dashboard (Admin)

- Total SKUs, total units on hand, total inventory value (at cost)
- Expiring soon: 30/60/90 day view
- Low stock alerts (below reorder point)
- Out of stock list
- Quarantined items
- Dead stock (no movement in 60+ days)

### 8.2 Stock Management

- Add/edit products with all regulatory fields
- Receive stock via GRN (Goods Received Note)
- Manual stock adjustments with reason codes (damage, theft, expired, found, correction)
- Transfer between locations
- FEFO enforcement: when fulfilling orders, system always picks the batch with earliest expiry

### 8.3 Expiry Tracking

- Automated alerts: 90 days → notification to inventory manager; 60 days → escalation; 30 days → urgent
- Expiring stock report shows: product, batch, expiry date, quantity, estimated loss value
- Options: create clearance discount, return to supplier, schedule destruction
- Destruction records written to audit log and controlled substance register (if applicable)

### 8.4 Stocktake Module

1. Admin creates a stocktake (reference number, scope: full or partial)
2. System locks stock edits for items in scope during count
3. Staff use admin UI to enter physical counts batch-by-batch
4. System computes variances
5. Admin reviews variances, approves adjustments
6. System writes adjusting stock movements and updates balances

### 8.5 Purchase Order Workflow

1. Low stock alert triggers → reorder suggestion generated
2. Staff creates PO from suggestion or from scratch
3. PO sent to supplier via email (auto-generated PDF)
4. Supplier acknowledges (manual update or portal if future)
5. Goods arrive → GRN created → stock received batch by batch
6. Variances from PO quantity → documented and reported to supplier
7. Supplier invoice matched to PO → payment scheduled

### 8.6 Demand Forecasting (AI)

- Analyses 90-day sales history per product
- Applies seasonal adjustments (malaria season, flu season, school season)
- Outputs: "Based on current velocity and upcoming season, stock out risk for Amoxicillin 500mg in 18 days. Recommended reorder: 2,000 units."
- Displayed in inventory dashboard as AI Insights panel

---

## 9. MODULE 4 — PRESCRIPTION MANAGEMENT

### 9.1 Prescription Upload Flow (Customer)

1. Customer adds a prescription-required item to cart
2. System prompts: "This item requires a valid prescription. Upload now or use a saved prescription."
3. Customer uploads photo/scan (JPEG, PNG, PDF — max 10MB)
4. File stored in R2 with customer_id/prescription_id path
5. OCR runs immediately (Claude API) — extracts: doctor name, clinic, date, drugs, dosages, quantities
6. Pre-fills prescription record with OCR data
7. Customer confirms or corrects extracted data
8. Prescription goes to pharmacist review queue

### 9.2 Pharmacist Review Queue (Admin)

- All pending prescriptions listed with: customer name, uploaded time, OCR summary, expiry risk
- Pharmacist opens prescription: sees original image + OCR-extracted data side by side
- Actions: Approve | Reject (with reason) | Request Re-upload
- Approval links prescription to order, order moves to processing
- Approval records pharmacist's Clerk ID + timestamp
- SLA target: review within 2 hours during business hours

### 9.3 Prescription Validation Rules

- Issue date not older than 90 days (configurable)
- Drug on prescription matches drug in cart (generic name match)
- Quantity on prescription >= quantity ordered
- Prescription not previously used to fulfil same drugs (prevents refill abuse)
- Doctor name not on blacklist
- Controlled substance prescriptions require additional fields (Schedule class, doctor DEA equivalent)

### 9.4 Controlled Substance Register

Every dispensing of a controlled substance writes to `controlled_substance_register` including:
- Product, batch, quantity, running balance
- Customer identity (ID verified)
- Prescription reference
- Dispensing pharmacist
- Witness (if destruction)

One-click export to regulator-formatted PDF for MINSANTE or equivalent authority.

### 9.5 ADR (Adverse Drug Reaction) Reporting

- Patient can report a reaction from order detail page or account
- Form captures: product, batch number, symptoms, severity, onset date, other medications
- Alert sent immediately to pharmacist
- Report auto-formatted for national pharmacovigilance authority
- Logged in audit trail

---

## 10. MODULE 5 — AVAILABILITY & DELIVERY ENGINE

### 10.1 Real-Time Availability Signal

Computed at runtime per product per request:

```typescript
type AvailabilityStatus =
  | { status: 'in_stock'; quantity: number }
  | { status: 'low_stock'; quantity: number; threshold: number }
  | { status: 'out_of_stock'; restock_date?: Date; restock_qty?: number }
  | { status: 'on_order'; po_id: string; expected_date: Date }
  | { status: 'prescription_required'; available: boolean }
  | { status: 'controlled'; available: boolean }
```

Thresholds:
- `low_stock` = quantity_on_hand - quantity_reserved <= reorder_point
- `in_stock` = quantity_on_hand - quantity_reserved > reorder_point

### 10.2 Delivery Estimate Calculation

```typescript
function calculateDeliveryEstimate(
  productId: string,
  zoneId: string,
  orderTime: Date,
  hasPresciption: boolean,
  deliveryMethod: 'standard' | 'express'
): DeliveryEstimate {
  
  const zone = getZone(zoneId);
  const cutoff = getCutoffRule();
  const holidays = getHolidays(zone.countries);

  // Step 1: Processing delay
  const cutoffToday = setHour(orderTime, cutoff.cutoff_hour);
  const processStart = orderTime < cutoffToday
    ? addBusinessDays(startOfDay(orderTime), 0, holidays)  // Same day
    : addBusinessDays(startOfDay(orderTime), 1, holidays);  // Next day
  
  // Step 2: Prescription verification delay
  const prescriptionDelay = hasPresciption ? 0.25 : 0; // 6 hours max
  
  // Step 3: Transit time
  const transitDays = deliveryMethod === 'express'
    ? zone.express_days
    : zone.standard_days_min;
  
  // Step 4: Calculate earliest and latest dates
  const earliest = addBusinessDays(processStart, transitDays + prescriptionDelay, holidays);
  const latest = addBusinessDays(processStart, zone.standard_days_max, holidays);

  return {
    earliest,
    latest,
    method: deliveryMethod,
    fee: deliveryMethod === 'express' ? zone.express_fee : zone.standard_fee,
    cutoffMessage: orderTime < cutoffToday
      ? `Order within ${formatTimeLeft(cutoffToday, orderTime)} for today's dispatch`
      : null
  };
}
```

### 10.3 ATP for B2B

```typescript
function getATP(productId: string, requestedQty: number): ATPResponse {
  const batches = getBatchesByFEFO(productId);
  let remaining = requestedQty;
  const commitments: ATPCommitment[] = [];

  for (const batch of batches) {
    const available = batch.quantity_on_hand - batch.quantity_reserved;
    if (available > 0) {
      const commit = Math.min(available, remaining);
      commitments.push({ qty: commit, availableDate: new Date(), batchId: batch.id });
      remaining -= commit;
    }
    if (remaining === 0) break;
  }

  // Check open POs for remaining
  if (remaining > 0) {
    const openPOs = getOpenPOsForProduct(productId);
    for (const po of openPOs) {
      const available = po.quantity_ordered - po.quantity_received;
      if (available > 0) {
        const commit = Math.min(available, remaining);
        commitments.push({ qty: commit, availableDate: po.expected_delivery, poId: po.id });
        remaining -= commit;
      }
      if (remaining === 0) break;
    }
  }

  return {
    requested: requestedQty,
    fullyCommitted: remaining === 0,
    commitments,
    shortfall: remaining,
  };
}
```

### 10.4 Stock Reservation Flow

**Soft reservation (cart):**
- On add-to-cart: insert `stock_reservations` with type `soft`, `expires_at` = NOW + 15 min
- Redis key `reservation:{cartId}:{productId}` stores reservation ID
- Cron every 5 minutes: release expired soft reservations, update `atp_cache`

**Hard reservation (order placed):**
- On order confirmed: upgrade soft → hard reservation, `expires_at` = NULL
- On order cancelled/expired: release hard reservation

---

## 11. MODULE 6 — PAYMENTS & FINANCIALS

### 11.1 Payment Provider Abstraction

```typescript
// packages/payments/index.ts
interface PaymentProvider {
  initiate(params: InitiatePaymentParams): Promise<PaymentInitResult>;
  verify(reference: string): Promise<PaymentVerifyResult>;
  refund(reference: string, amount: number): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Providers
class FlutterwaveProvider implements PaymentProvider { ... }
class PaystackProvider implements PaymentProvider { ... }
class StripeProvider implements PaymentProvider { ... }

// Factory
function getProvider(method: string): PaymentProvider {
  if (['mtn_momo', 'orange_money', 'wave', 'card_africa'].includes(method))
    return new FlutterwaveProvider();
  if (method === 'card_paystack') return new PaystackProvider();
  if (['card_intl', 'usd', 'eur'].includes(method)) return new StripeProvider();
  throw new Error(`Unknown payment method: ${method}`);
}
```

### 11.2 Payment Methods by Region

| Method | Provider | Currency | Regions |
|---|---|---|---|
| MTN Mobile Money | Flutterwave | XAF, XOF, GHS, NGN | Cameroon, Côte d'Ivoire, Ghana |
| Orange Money | Flutterwave | XAF, XOF | Cameroon, Senegal, Mali |
| Wave | Flutterwave | XOF | Senegal, Côte d'Ivoire |
| Card (Africa) | Flutterwave / Paystack | Multi | Pan-Africa |
| Card (International) | Stripe | USD, EUR, GBP | International |
| Bank Transfer | Manual | Any | B2B |
| Cash on Delivery | Internal | XAF | Local only |

### 11.3 B2B Invoice Generation

Auto-generated PDF invoice on order placement includes:
- Company letterhead (logo, address, TIN, RCCM)
- Invoice number, date, due date
- Customer details + their PO number
- Line items: product, quantity, unit price, total
- Subtotal, tax breakdown (VAT at applicable rate), grand total
- Payment instructions (bank details, mobile money)
- "Thank you" footer

### 11.4 Financial Dashboard

- Daily revenue (B2C + B2B, by payment method)
- Outstanding B2B receivables with aging (0–15, 16–30, 31–60, 60+ days)
- Gross margin by product / category / period
- Refunds and adjustments
- Loyalty points liability
- Cash flow projection (next 30 days based on open orders and due invoices)

---

## 12. MODULE 7 — AI FEATURES

### 12.1 Prescription OCR

**Trigger:** Customer uploads prescription image

**Implementation:**
```typescript
async function ocrPrescription(fileUrl: string): Promise<OCRResult> {
  const imageBase64 = await fetchAsBase64(fileUrl);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
        },
        {
          type: 'text',
          text: `Extract all information from this medical prescription. Return ONLY valid JSON with no preamble:
          {
            "doctor_name": string,
            "clinic_name": string,
            "clinic_address": string,
            "issue_date": "YYYY-MM-DD",
            "patient_name": string,
            "drugs": [
              {
                "name": string,
                "dosage": string,
                "frequency": string,
                "duration": string,
                "quantity": number
              }
            ],
            "notes": string,
            "confidence": "high" | "medium" | "low"
          }
          If a field is not visible, use null. Never guess.`
        }
      ]
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

### 12.2 Drug Interaction Checker

**Trigger:** Customer adds product to cart, checkout

```typescript
async function checkDrugInteractions(
  cartProducts: Product[],
  patientMedications: string[]  // From patient's medication history
): Promise<InteractionWarning[]> {
  
  const allDrugs = [
    ...cartProducts.map(p => p.generic_name),
    ...patientMedications
  ];

  // Step 1: Check local drug_interactions table (fast)
  const dbInteractions = await queryInteractionsDB(allDrugs);
  
  // Step 2: If any unknown combinations, check via Claude
  const unknownPairs = getUnknownPairs(allDrugs, dbInteractions);
  if (unknownPairs.length > 0) {
    const aiInteractions = await checkInteractionsViaAI(unknownPairs);
    // Save to drug_interactions table for future caching
    await cacheInteractions(aiInteractions);
    return [...dbInteractions, ...aiInteractions];
  }

  return dbInteractions;
}
```

**UI Display:** Yellow warning (moderate) or Red alert (major/contraindicated) shown in cart with explanation and "Consult pharmacist before proceeding" CTA.

### 12.3 Virtual Pharmacist Chatbot

- 24/7 chat widget on all storefront pages
- Powered by Claude API with pharmacy system prompt
- Can answer: drug information, dosage guidance, OTC recommendations for symptoms, drug availability
- Cannot: diagnose, prescribe, override pharmacist decisions
- Escalation: "Would you like to speak with a licensed pharmacist? Available 8am–8pm"
- Conversation logs stored for quality review

### 12.4 Inventory Demand Forecasting

- Runs nightly via cron job
- Inputs: 90-day sales history, seasonal patterns, open orders, current stock, lead times
- Output: Per-product risk score and recommended action
- Displayed in admin dashboard as "AI Reorder Insights"

### 12.5 Smart Symptom → Product Suggestion

- Search bar accepts symptom queries ("headache and fever", "stomach pain")
- Claude maps symptoms to appropriate OTC product categories
- Returns curated product list with dosage guidance note
- Disclaimer: "This is a product suggestion, not medical advice. Consult a pharmacist or doctor for diagnosis."

---

## 13. MODULE 8 — SUBSCRIPTIONS & RECURRING ORDERS

### 13.1 Chronic Medication Subscriptions

**Customer Flow:**
1. On product page for a chronic medication: "Subscribe & Save 5%"
2. Customer selects cycle: monthly, every 6 weeks, every 2 months
3. Selects delivery address and payment method (card token stored via Stripe/Flutterwave)
4. First order placed immediately
5. Next order auto-placed on calculated next_order_date

**Subscription Management:**
- SMS reminder 5 days before: "Your monthly medication ships in 5 days. Reply SKIP to skip this month."
- SKIP → postpone one cycle
- PAUSE → halt until customer resumes
- CANCEL → available anytime, no penalty

**Prescription Handling:**
- Subscription to Rx drugs requires a valid prescription on file
- System checks prescription validity 10 days before each cycle
- If expired: customer notified to upload new script before next dispatch

### 13.2 Wellness Boxes

- Admin creates box: name, description, contents (fixed product list), price
- Customer subscribes monthly
- System auto-creates order from subscription_items on each cycle
- Box contents can be updated by admin; customers notified of changes

### 13.3 B2B Standing Orders

- Wholesale client defines: products, quantities, delivery frequency, delivery address
- Stored as subscription with plan_type = `standing_order`
- Auto-generates wholesale order + proforma invoice on each cycle
- ATP check run before each cycle; if stock insufficient, account manager alerted
- Client can modify standing order anytime from portal

---

## 14. MODULE 9 — TELECONSULTATION & DOCTOR NETWORK

### 14.1 Doctor Onboarding

- Admin onboards doctors: name, specialty, license number, consultation fee, availability
- Doctor gets a staff portal login (limited access: see appointment queue, issue prescriptions)
- Partner clinics linked as organizations with multiple doctors

### 14.2 Appointment Booking

- Patient visits `/consult`
- Filters by specialty, language, availability, consultation type (video/text/in-person)
- Selects slot, pays consultation fee
- Confirmation sent via email + SMS with video link (Jitsi Meet integration or similar)

### 14.3 Digital Prescription Issuance

- After consultation, doctor issues digital prescription on platform
- Prescription auto-linked to patient's account
- Patient gets SMS: "Your prescription from Dr. X is ready. Order now: [link]"
- One-click order from prescription → all drugs pre-added to cart

### 14.4 Lab Test Booking

- Partner labs listed with: name, tests offered, prices, turnaround time
- Patient books test → confirmation sent → lab notified
- Results uploaded by lab to patient's account
- If results flagged abnormal → CTA to book doctor consultation

---

## 15. MODULE 10 — MARKETING & RETENTION ENGINE

### 15.1 Loyalty Program

| Tier | Spend Threshold | Points per 1000 XAF | Benefits |
|---|---|---|---|
| Bronze | 0+ | 10 points | Basic rewards |
| Silver | 150,000 XAF | 15 points | Free standard delivery |
| Gold | 500,000 XAF | 20 points | Free express, dedicated pharmacist line, early access |

- Points redeemable at checkout (1 point = 1 XAF)
- Points expire 12 months from earning date
- Bonus points campaigns: "Double points on vitamins this week"

### 15.2 Promotions Engine

- Admin creates promotions: percentage discount, fixed discount, free delivery, BOGO
- Applies to: all products, specific categories, specific products, specific customers, B2B tiers
- Promo codes + automatic (no code required) campaigns
- Flash sales with start/end time and countdown timer on storefront
- Product-level "was/now" pricing display

### 15.3 Automated Health Reminders

Cron-based notifications:
- "Your monthly prescription medication is due in 5 days" (for non-subscribed repeat buyers)
- "It's been 30 days since you ordered [product] — time to reorder?"
- "Your saved prescription expires in 15 days — renew it now"
- "New: [product] is now available in our store" (based on past search/wishlist)

### 15.4 Referral Program

- Customer gets unique referral link
- Referred customer places first order → referrer earns 500 XAF credit (B2C) or 1% of first 3 orders (B2B)
- Dashboard showing referrals and earned credits

### 15.5 Wishlist & Back-in-Stock

- Customer adds out-of-stock item to wishlist
- When stock arrives, SMS + email sent immediately
- Wishlist also used for demand sensing (products with high wishlist count prioritized for reorder)

---

## 16. MODULE 11 — STAFF BACK-OFFICE & ADMIN

### 16.1 Staff Roles

| Role | Access |
|---|---|
| Super Admin | Full access to all modules |
| Pharmacist | Prescriptions, dispensing log, order processing |
| Inventory Manager | Products, inventory, purchase orders, GRNs |
| Sales Representative | Customer management, B2B orders, B2B portal support |
| Finance Officer | Payments, invoices, credit notes, financial reports |
| Delivery Coordinator | Order dispatch, delivery tracking, courier management |
| Customer Support | Order lookup, refunds, customer messaging |

### 16.2 Admin Dashboard Home

- Today's stats: orders received, revenue, prescriptions pending, low stock alerts
- Dispatch queue: orders ready to ship today (sorted by promised delivery date risk)
- Prescription review queue: pending with age
- Expiring stock alerts
- AI insights panel (demand forecast, dead stock)

### 16.3 Order Management

- Full order list with filters: status, type (B2C/B2B), date range, customer, payment status
- Order detail page: customer info, items, delivery, payment, prescription, status history
- Actions: Confirm, move to processing, mark packed, add tracking number, mark delivered, cancel, refund
- Bulk actions: mark multiple orders as packed, print packing slips

### 16.4 Product & Inventory Management

- Product CRUD with all fields
- Bulk import via CSV (SKU, name, price, stock, category)
- Batch management: add batch, view all batches per product, quarantine, write off
- Reorder rule management
- Stocktake initiation and completion

### 16.5 Customer Management

- Customer list with search and filter
- Customer detail: profile, order history, prescriptions, loyalty points, credit balance (B2B)
- Manual loyalty points adjustment
- B2B credit limit management
- ID verification status and document view

---

## 17. MODULE 12 — BUSINESS INTELLIGENCE & REPORTS

### 17.1 Sales Reports

- Revenue by period (day/week/month/quarter/year)
- Revenue by channel (B2C vs B2B)
- Revenue by product, by category, by brand
- Revenue by payment method
- Revenue by delivery zone / country
- Top 20 products by revenue and by units sold
- Average order value trend

### 17.2 Inventory Reports

- Current stock value (at cost, at retail)
- Stock aging report (days on hand by product)
- Expiring stock report with estimated write-off value
- Dead stock report (no movement 60+ days)
- COGS (cost of goods sold) per period
- Supplier performance scorecard

### 17.3 Customer Reports

- New vs returning customers
- Customer LTV distribution
- B2B client revenue contribution
- Loyalty tier distribution
- Churn analysis (customers not ordered in 60/90 days)
- Subscription MRR (monthly recurring revenue)

### 17.4 Financial Reports

- P&L summary (revenue, COGS, gross margin)
- Outstanding receivables aging
- Payment method breakdown
- Refund rate by product/category
- VAT collected by country
- Export to CSV/Excel

### 17.5 Compliance Reports

- Controlled substances ledger (regulatory format)
- Dispensing log (by pharmacist, by product, by date range)
- Prescription audit trail
- ADR (adverse drug reaction) summary
- All reports export to PDF and CSV

---

## 18. MODULE 13 — COMPLIANCE & TRUST INFRASTRUCTURE

### 18.1 Regulatory Compliance

- **Cameroon (MINSANTE):** Controlled substances register, pharmacist on duty logging, dispensing records
- **CEMAC zone:** Import permits tracked per batch, certificates of analysis stored
- **EU customers:** GDPR consent management, right to erasure workflow, data export
- **International:** Product registration numbers stored, country-specific product availability flags

### 18.2 Anti-Counterfeit Verification

Integration with **mPedigree** or **Sproxil**:
- Every product page has a scratch-and-verify widget
- Customer enters code from product packaging
- API returns: Authentic / Suspicious / Already Used
- Result displayed with timestamp
- Suspicious verifications trigger admin alert

### 18.3 Pharmacist Verification

- Every dispensing action requires authenticated pharmacist (Clerk role: pharmacist)
- Pharmacist license number stored in their staff profile
- Displayed on dispensing log and prescription approval records
- License expiry tracked; alerts at 90/30 days before expiry

### 18.4 Cold Chain Certificate

For cold-chain products:
- Temperature logger data input at dispatch, mid-transit, and delivery
- System generates cold chain certificate PDF per order
- Attached to delivery confirmation email
- Stored in customer's order record

### 18.5 Data Security

- All PII encrypted at rest (Neon encryption)
- Prescription images stored in private R2 bucket (signed URL access only)
- API rate limiting via Upstash Redis
- Staff sessions via Clerk with MFA enforced for Super Admin and Pharmacist roles
- All external API calls go through server-side (no client-side API keys)
- Regular automated DB backups (Neon point-in-time recovery)

---

## 19. MODULE 14 — SUPPLIER INTELLIGENCE

### 19.1 Supplier Scorecard

Computed monthly per supplier:
- **On-time delivery rate:** % of POs delivered by expected date
- **Fill rate:** % of ordered quantity delivered without shortage
- **Rejection rate:** % of received units rejected (wrong product, damage, expired)
- **Price consistency:** variance of unit cost across POs
- **Lead time accuracy:** actual vs quoted lead time

Displayed in supplier profile. Used to auto-rank preferred suppliers for reorder suggestions.

### 19.2 Automated RFQ

When stock hits reorder point and auto-reorder is enabled:
1. System identifies top 2–3 suppliers for the product (by score)
2. Auto-generates RFQ email with: product, quantity needed, required delivery date
3. Sends to suppliers via Resend
4. Staff receives reminder to follow up in 48h if no response
5. On receiving quotes, staff selects best and raises PO in one click

### 19.3 Import Documentation

Per batch record:
- Import permit number and expiry
- Certificate of Analysis (COA) URL
- Customs declaration number
- Country of origin declaration
- Cold chain documentation (if applicable)
- All searchable and downloadable for regulatory audits

---

## 20. API REFERENCE

### 20.1 Products

```
GET    /api/products                    List products (paginated, filterable)
GET    /api/products/:slug              Get product detail
GET    /api/products/:id/availability   Get real-time availability
GET    /api/products/:id/delivery       Get delivery estimate for zone
POST   /api/products                    Create product (admin)
PUT    /api/products/:id                Update product (admin)
DELETE /api/products/:id                Soft delete product (admin)
POST   /api/products/bulk-import        CSV import (admin)
GET    /api/products/:id/interactions   Drug interaction check
```

### 20.2 Inventory

```
GET    /api/inventory/batches                List all batches
GET    /api/inventory/batches/:productId     Batches for product
POST   /api/inventory/batches                Add batch (GRN)
PUT    /api/inventory/batches/:id            Update batch
POST   /api/inventory/adjustments            Manual stock adjustment
GET    /api/inventory/movements              Stock movement history
GET    /api/inventory/alerts                 Low stock + expiry alerts
POST   /api/inventory/stocktakes             Create stocktake
GET    /api/inventory/stocktakes/:id         Stocktake detail
PUT    /api/inventory/stocktakes/:id/items   Update counted quantities
POST   /api/inventory/stocktakes/:id/complete Complete stocktake
GET    /api/inventory/atp/:productId         Get ATP for product
```

### 20.3 Orders

```
GET    /api/orders                      List orders
GET    /api/orders/:id                  Get order detail
POST   /api/orders                      Create order
PUT    /api/orders/:id/status           Update order status
POST   /api/orders/:id/cancel           Cancel order
POST   /api/orders/:id/refund           Initiate refund
GET    /api/orders/:id/invoice          Download invoice PDF
GET    /api/orders/:id/tracking         Get tracking info
```

### 20.4 Prescriptions

```
GET    /api/prescriptions               List prescriptions
POST   /api/prescriptions/upload        Upload + OCR prescription
GET    /api/prescriptions/:id           Get prescription detail
PUT    /api/prescriptions/:id/review    Pharmacist approve/reject
GET    /api/prescriptions/queue         Pharmacist review queue
GET    /api/prescriptions/controlled    Controlled substance register
```

### 20.5 Payments

```
POST   /api/payments/initiate           Initiate payment
GET    /api/payments/verify/:reference  Verify payment
POST   /api/payments/refund             Process refund
POST   /api/webhooks/flutterwave        Flutterwave webhook
POST   /api/webhooks/paystack           Paystack webhook
POST   /api/webhooks/stripe             Stripe webhook
```

### 20.6 Delivery

```
GET    /api/delivery/zones              List delivery zones
GET    /api/delivery/estimate           Get delivery estimate
POST   /api/delivery/zones              Create zone (admin)
PUT    /api/delivery/zones/:id          Update zone (admin)
```

### 20.7 Suppliers & POs

```
GET    /api/suppliers                   List suppliers
POST   /api/suppliers                   Create supplier
GET    /api/suppliers/:id               Supplier detail + scorecard
GET    /api/purchase-orders             List POs
POST   /api/purchase-orders             Create PO
PUT    /api/purchase-orders/:id/send    Send PO to supplier
POST   /api/purchase-orders/:id/receive Create GRN
```

### 20.8 AI

```
POST   /api/ai/ocr                      OCR a prescription image
POST   /api/ai/interactions             Check drug interactions
POST   /api/ai/chat                     Virtual pharmacist chat
GET    /api/ai/forecast                 Demand forecast (admin)
POST   /api/ai/symptoms                 Symptom → product suggestion
```

---

## 21. AUTHENTICATION & AUTHORIZATION

### 21.1 Clerk Setup

- **Customer auth:** Email/password + social login (Google)
- **Staff auth:** Email/password only, MFA enforced for Pharmacist and Super Admin
- **B2B portal:** Uses customer auth with `customer_type = business` check
- **Webhooks:** Clerk webhooks sync user creation/deletion to `customers` table

### 21.2 RBAC Middleware

```typescript
// api/middleware/rbac.ts
const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  pharmacist: ['prescriptions.*', 'orders.read', 'orders.update', 'dispensing.*'],
  inventory_manager: ['inventory.*', 'products.*', 'suppliers.*', 'purchase_orders.*'],
  finance: ['payments.*', 'invoices.*', 'reports.financial'],
  sales_rep: ['customers.*', 'orders.b2b.*'],
  delivery_coordinator: ['orders.dispatch', 'orders.tracking'],
  customer_support: ['orders.read', 'customers.read', 'payments.refund'],
};

export function requirePermission(permission: string) {
  return (req, res, next) => {
    const { role } = req.auth;
    if (hasPermission(role, permission)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}
```

---

## 22. PAYMENT PROVIDER ABSTRACTION

```typescript
// apps/api/src/lib/payments/index.ts

interface InitiatePaymentParams {
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  customerEmail: string;
  customerPhone?: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

interface PaymentInitResult {
  paymentRef: string;
  redirectUrl?: string;         // Card payments
  ussdCode?: string;            // USSD mobile money
  mobilePrompt?: boolean;       // Push to phone mobile money
  providerRef: string;
}

// Usage
const provider = getProvider(order.payment_method);
const result = await provider.initiate({
  orderId: order.id,
  amount: order.total_amount,
  currency: order.currency,
  method: order.payment_method,
  customerEmail: customer.email,
  callbackUrl: `${API_URL}/api/webhooks/payment-callback`,
});
```

---

## 23. NOTIFICATION SYSTEM

### 23.1 Notification Types

| Trigger | Channels |
|---|---|
| Order confirmed | Email + SMS |
| Prescription approved | Email + SMS |
| Prescription rejected | Email + SMS |
| Order dispatched + tracking | Email + SMS |
| Order delivered | SMS |
| Payment confirmed | Email + SMS |
| Payment failed | SMS |
| Low stock (staff) | Email + In-app |
| Expiring stock (staff) | Email + In-app |
| Subscription due in 5 days | SMS |
| Back in stock (wishlist) | SMS + Email |
| Overdue invoice (B2B) | Email + SMS |
| Prescription expiring | Email + SMS |

### 23.2 Notification Abstraction

```typescript
// apps/api/src/services/notification.service.ts

interface NotificationPayload {
  to: string;           // Email or phone
  type: string;         // Template key
  data: Record<string, string>;
}

async function sendEmail(payload: NotificationPayload) { /* Resend */ }
async function sendSMS(payload: NotificationPayload) {
  const provider = payload.to.startsWith('+237')    // Cameroon
    ? africasTalkingProvider
    : twilioProvider;
  await provider.send(payload);
}

async function notify(
  channels: ('email' | 'sms')[],
  type: string,
  data: Record<string, string>
) {
  for (const channel of channels) {
    if (channel === 'email') await sendEmail({ to: data.email, type, data });
    if (channel === 'sms') await sendSMS({ to: data.phone, type, data });
  }
}
```

---

## 24. FILE STORAGE & MEDIA

### 24.1 Cloudflare R2 Buckets

| Bucket | Contents | Access |
|---|---|---|
| `pharmaflow-products` | Product images | Public CDN |
| `pharmaflow-prescriptions` | Prescription uploads | Private (signed URLs) |
| `pharmaflow-documents` | Invoices, PO PDFs, COAs | Private (signed URLs) |
| `pharmaflow-cold-chain` | Cold chain certificates | Private (signed URLs) |

### 24.2 Prescription Upload Flow

1. Client requests signed upload URL from API
2. API generates R2 presigned PUT URL with 10-min TTL
3. Client uploads directly to R2 (bypasses API server)
4. Client notifies API of upload completion with R2 key
5. API triggers OCR job asynchronously
6. OCR result stored in `customer_prescriptions.ocr_data`

---

## 25. ENVIRONMENT VARIABLES

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Auth
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_PRODUCTS=pharmaflow-products
R2_BUCKET_PRESCRIPTIONS=pharmaflow-prescriptions
R2_BUCKET_DOCUMENTS=pharmaflow-documents

# Payments
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_WEBHOOK_HASH=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=

# Notifications
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@pharmaflow.com
AFRICAS_TALKING_API_KEY=
AFRICAS_TALKING_USERNAME=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# AI
ANTHROPIC_API_KEY=

# Anti-counterfeit
MPEDIGREE_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
API_URL=
NODE_ENV=
```

---

## 26. PHASE-BY-PHASE BUILD PLAN

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Turborepo monorepo setup (web + api + db packages)
- [ ] Drizzle schema: products, inventory_batches, customers, delivery_zones
- [ ] Neon DB provisioned, migrations running
- [ ] Clerk auth integrated (customer + staff)
- [ ] Express API skeleton with auth middleware and RBAC
- [ ] Admin: product CRUD, category management
- [ ] Admin: inventory batch management (add batch, view stock)
- [ ] Basic product listing and detail pages (no cart yet)

### Phase 2 — B2C Ecommerce (Weeks 4–7)
- [ ] Cart (Redis-backed, soft reservations)
- [ ] Checkout flow (address, delivery method selection)
- [ ] Delivery estimate engine (zone-based calculation)
- [ ] Availability engine (real-time status per product)
- [ ] Flutterwave integration (card + MTN MoMo + Orange Money)
- [ ] Order creation, confirmation, status management
- [ ] Email + SMS notifications (order confirmation, dispatch, delivery)
- [ ] Customer account pages (orders, addresses, profile)
- [ ] Order tracking page

### Phase 3 — Prescription Module (Weeks 8–9)
- [ ] Prescription upload UI + R2 signed URL upload
- [ ] Claude API OCR integration
- [ ] Pharmacist review queue (admin)
- [ ] Prescription validation rules
- [ ] Dispensing log (auto-write on order dispatch)
- [ ] Controlled substance register
- [ ] Prescription-gated checkout flow

### Phase 4 — Inventory & Procurement (Weeks 10–11)
- [ ] FEFO stock allocation on order
- [ ] Reorder rules and low-stock alerts
- [ ] Purchase order workflow (create, send, receive)
- [ ] GRN module
- [ ] Expiry tracking + alerts
- [ ] Stocktake module
- [ ] Dead stock report

### Phase 5 — B2B Wholesale Portal (Weeks 12–14)
- [ ] B2B registration + license verification flow
- [ ] B2B-specific pricing (tiered)
- [ ] ATP (Available to Promise) calculation and display
- [ ] Bulk CSV ordering
- [ ] Invoice PDF generation
- [ ] Credit limit management
- [ ] Net payment terms + overdue alerts
- [ ] B2B standing orders
- [ ] Paystack integration
- [ ] B2B order management (admin)

### Phase 6 — AI Features (Weeks 15–16)
- [ ] Drug interaction checker (DB + Claude fallback)
- [ ] Virtual pharmacist chatbot
- [ ] Symptom → product suggestion
- [ ] Demand forecasting cron job

### Phase 7 — Subscriptions & Retention (Weeks 17–18)
- [ ] Chronic medication subscription engine
- [ ] Wellness box subscriptions
- [ ] Stripe integration (recurring card payments)
- [ ] Loyalty program (points accrual, redemption, tiers)
- [ ] Promotional engine (promo codes, flash sales)
- [ ] Automated health reminders (cron)
- [ ] Wishlist + back-in-stock alerts
- [ ] Referral program

### Phase 8 — Advanced Modules (Weeks 19–21)
- [ ] Teleconsultation booking
- [ ] Doctor digital prescription issuance
- [ ] Anti-counterfeit (mPedigree) integration
- [ ] Cold chain certificate generation
- [ ] ADR reporting
- [ ] Multi-currency + Stripe international
- [ ] GDPR consent + right to erasure

### Phase 9 — Intelligence & Polish (Weeks 22–24)
- [ ] Business intelligence dashboard
- [ ] All compliance reports (controlled substance register, dispensing log)
- [ ] Supplier scorecard
- [ ] Automated RFQ
- [ ] Multi-language (French + English)
- [ ] SEO optimization (Next.js metadata, product schema markup)
- [ ] Performance audit (Core Web Vitals)
- [ ] Security audit
- [ ] Load testing

---

## 27. NON-FUNCTIONAL REQUIREMENTS

### Performance
- Product listing page: < 1s LCP (Next.js SSR + edge caching)
- Add to cart: < 200ms response
- Availability check: < 100ms (Redis ATP cache)
- Delivery estimate: < 200ms
- Order placement: < 2s end-to-end

### Availability
- API uptime target: 99.5%
- Prescription review SLA: reviewed within 2 business hours
- Payment webhook processing: < 5 seconds

### Security
- All API endpoints authenticated (except product listing, search)
- Staff MFA enforced for Pharmacist and Super Admin roles
- Prescription images accessible only via signed URLs (15-min TTL)
- Payment keys never exposed to frontend
- Rate limiting: 100 req/min per IP on public endpoints, 1000 req/min on authenticated

### Scalability
- Database: Neon autoscales; connection pooling via PgBouncer (built-in to Neon)
- Cache: Upstash Redis scales automatically
- File storage: R2 handles unlimited scale
- API: Railway autoscales horizontally

---

## 28. OPEN QUESTIONS & FUTURE SCOPE

### Open Questions
1. **Insurance integration** — Which specific insurers to target first? (CNPS Cameroon, CNAMGS Gabon?) API availability needs investigation.
2. **BNPL for B2B** — Build internally or partner with a fintech? (Suggest: partner with Carbon or Pezesha first)
3. **Delivery logistics** — Build own delivery network or integrate with Yango/local couriers via API? Start with Yango.
4. **Teleconsultation video** — Jitsi Meet (free, self-hosted) vs Agora vs Twilio Video?
5. **Drug database** — Build own drug reference database or license from WHO/OpenFDA?

### Future Scope (Post-MVP)
- Mobile app for delivery riders (React Native)
- White-label mode (multi-tenant) — flip to SaaS model
- Insurance claims processing
- Hospital formulary management (direct hospital supply)
- Serialization and track-and-trace per unit (GS1 SGTIN)
- AI-powered personalized health recommendations
- Integration with national health information systems
- Veterinary pharmaceutical module

---

*PHARMAFLOW_PLAN.md — Version 1.0*
*Generated: June 2026*
*Stack: Next.js 14 · Node/Express · Drizzle ORM · Neon PostgreSQL · Clerk · Cloudflare R2 · Flutterwave · Paystack · Stripe · Claude API · Upstash Redis · Resend · Africa's Talking*
