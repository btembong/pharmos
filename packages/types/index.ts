// Re-export all DB inferred types
export type {
  Product,
  NewProduct,
  ProductCategory,
  NewProductCategory,
  ProductPrice,
  NewProductPrice,
  DrugInteraction,
  NewDrugInteraction,
} from '@pharmaflow/db/schema';

export type {
  InventoryBatch,
  NewInventoryBatch,
  StockMovement,
  NewStockMovement,
  StockReservation,
  NewStockReservation,
  ReorderRule,
  NewReorderRule,
} from '@pharmaflow/db/schema';

export type {
  Customer,
  NewCustomer,
  CustomerAddress,
  NewCustomerAddress,
} from '@pharmaflow/db/schema';

export type {
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
  OrderStatusHistory,
  NewOrderStatusHistory,
} from '@pharmaflow/db/schema';

export type {
  Payment,
  NewPayment,
  PaymentMethod,
  NewPaymentMethod,
} from '@pharmaflow/db/schema';

export type {
  DeliveryZone,
  NewDeliveryZone,
  CutoffRule,
  NewCutoffRule,
  PublicHoliday,
  NewPublicHoliday,
} from '@pharmaflow/db/schema';

export type {
  TaxRate,
  NewTaxRate,
  AuditLog,
  NewAuditLog,
} from '@pharmaflow/db/schema';

// Shared enums and constants
export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'processing',
  'packed',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = [
  'zelle',
  'venmo',
  'cashapp',
  'wire_transfer',
  'check',
  'cash',
] as const;
export type ManualPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const INTERACTION_SEVERITIES = [
  'minor',
  'moderate',
  'major',
  'contraindicated',
] as const;
export type InteractionSeverity = (typeof INTERACTION_SEVERITIES)[number];

export const STAFF_ROLES = [
  'super_admin',
  'pharmacist',
  'inventory_manager',
  'finance',
  'customer_support',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;
export type USState = (typeof US_STATES)[number];

export const CARRIERS = ['usps', 'ups', 'fedex'] as const;
export type Carrier = (typeof CARRIERS)[number];

export const CARRIER_TRACKING_URLS: Record<Carrier, string> = {
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  ups: 'https://www.ups.com/track?tracknum=',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
};

// API response shapes
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}
