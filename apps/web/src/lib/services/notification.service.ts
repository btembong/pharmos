/**
 * Notification Service — Brevo (email) + Twilio (SMS)
 *
 * Brand palette:
 *   #010128 — Deep Indigo (primary text, dark footer)
 *   #7371FC — Violet (CTA buttons, links, key highlights)
 *   #A594F9 — Light Violet (unused — keeping minimal)
 *   #E5D9F2 — Lavender (dividers, borders)
 *   #F5EFFF — Pale Lavender (subtle backgrounds)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerContact {
  email: string;
  phone?: string | null;
  name: string;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderAddress {
  recipientName?: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
}

interface OrderPayload {
  orderNumber: string;
  total: number;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  taxAmount?: number;
  items?: OrderItem[];
  deliveryAddress?: OrderAddress | null;
  orderDate?: string;
  deliveryMethod?: string | null;
}

type CustomerNotificationType =
  | 'order.pending_payment'
  | 'order.confirmed'
  | 'order.processing'
  | 'order.dispatched'
  | 'order.delivered'
  | 'order.cancelled';

interface CustomerNotificationPayload {
  customer: CustomerContact;
  order: OrderPayload;
  extra?: Record<string, string>;
}

interface LowStockAlertPayload {
  items: { productName: string; currentStock: number; reorderPoint: number }[];
}

interface ExpiryAlertPayload {
  urgency: '30' | '60' | '90';
  items: { productName: string; batchNumber: string; expiryDate: string; quantityOnHand: number }[];
}

// ─── Brand ───────────────────────────────────────────────────────────────────

const B = {
  indigo: '#010128',
  violet: '#7371FC',
  lavender: '#E5D9F2',
  pale: '#F5EFFF',
  white: '#ffffff',
  text: '#010128',
  sub: '#4a4a68',
  muted: '#8c8c9a',
  danger: '#dc2626',
};

function logoUrl(): string {
  return 'https://res.cloudinary.com/dmxnsttmu/image/upload/v1782253875/Purple_header_Logo_bezof2.png';
}

function siteUrl(): string {
  return process.env.STOREFRONT_URL || 'https://pharmos.com';
}

// ─── Minimal enterprise template ─────────────────────────────────────────────

function wrapInBrandedTemplate(bodyHtml: string, preheader?: string): string {
  const w = '600';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pharmos</title></head>
<body style="margin:0;padding:0;background:${B.white};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}

<!-- HEADER — centered logo -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.white};">
  <tr><td align="center" style="padding:36px 24px 28px;">
    <img src="${logoUrl()}" alt="Pharmos" height="64" style="height:64px;width:auto;display:block;" />
  </td></tr>
</table>

<!-- Accent line -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="height:2px;background:linear-gradient(90deg,${B.lavender},${B.violet},${B.lavender});font-size:0;">&nbsp;</td></tr>
</table>

<!-- BODY -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.white};">
  <tr><td align="center" style="padding:44px 24px 40px;">
    <table width="${w}" cellpadding="0" cellspacing="0" style="max-width:${w}px;width:100%;">
      <tr><td>${bodyHtml}</td></tr>
    </table>
  </td></tr>
</table>

<!-- Divider -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="height:1px;background:${B.lavender};font-size:0;">&nbsp;</td></tr>
</table>

<!-- SUPPORT -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.white};">
  <tr><td align="center" style="padding:28px 24px;">
    <p style="margin:0;font-size:13px;color:${B.sub};line-height:1.8;">
      Questions? &nbsp;<a href="mailto:support@pharmos.com" style="color:${B.violet};text-decoration:none;font-weight:600;">support@pharmos.com</a>&nbsp; &middot; &nbsp;Mon&ndash;Fri, 9am&ndash;6pm ET
    </p>
  </td></tr>
</table>

<!-- LINKS -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.pale};">
  <tr><td align="center" style="padding:20px 24px;">
    <a href="${siteUrl()}/products" style="color:${B.sub};font-size:11px;text-decoration:none;padding:0 10px;">Shop</a>
    <span style="color:${B.lavender};">|</span>
    <a href="${siteUrl()}/track" style="color:${B.sub};font-size:11px;text-decoration:none;padding:0 10px;">Track Order</a>
    <span style="color:${B.lavender};">|</span>
    <a href="${siteUrl()}/account" style="color:${B.sub};font-size:11px;text-decoration:none;padding:0 10px;">My Account</a>
    <span style="color:${B.lavender};">|</span>
    <a href="${siteUrl()}/privacy" style="color:${B.sub};font-size:11px;text-decoration:none;padding:0 10px;">Privacy</a>
    <span style="color:${B.lavender};">|</span>
    <a href="${siteUrl()}/terms" style="color:${B.sub};font-size:11px;text-decoration:none;padding:0 10px;">Terms</a>
  </td></tr>
</table>

<!-- LEGAL -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${B.indigo};">
  <tr><td align="center" style="padding:28px 24px;">
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.45);line-height:1.7;">
      Pharmos LLC &middot; Licensed US Supplier<br/>
      Research compounds for in-vitro laboratory research only. Not for human use.
    </p>
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.25);line-height:1.6;">
      <a href="${siteUrl()}/unsubscribe" style="color:rgba(255,255,255,0.45);text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${siteUrl()}/privacy" style="color:rgba(255,255,255,0.45);text-decoration:underline;">Privacy Policy</a>
    </p>
  </td></tr>
</table>

</body></html>`;
}

// ─── Components ─────────────────────────────────────────────────────────────

function heading(text: string): string {
  return `<p style="margin:0 0 8px;font-size:18px;font-weight:500;color:${B.text};">${text}</p>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:${B.sub};">Hi ${name},</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;color:${B.sub};line-height:1.7;">${text}</p>`;
}

function orderRow(orderNumber: string, total: number): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td colspan="2" style="height:1px;background:${B.lavender};font-size:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:20px 0;">
          <p style="margin:0;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1.5px;">Order</p>
          <p style="margin:4px 0 0;font-size:17px;font-weight:600;color:${B.text};font-family:'Courier New',monospace;">${orderNumber}</p>
        </td>
        <td align="right" style="padding:20px 0;">
          <p style="margin:0;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1.5px;">Total</p>
          <p style="margin:4px 0 0;font-size:17px;font-weight:600;color:${B.violet};">$${total.toFixed(2)}</p>
        </td>
      </tr>
      <tr><td colspan="2" style="height:1px;background:${B.lavender};font-size:0;">&nbsp;</td></tr>
    </table>`;
}

function note(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:${B.sub};line-height:1.7;padding:16px 0;border-top:1px solid ${B.lavender};border-bottom:1px solid ${B.lavender};">${text}</p>`;
}

function dangerNote(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:${B.danger};line-height:1.7;padding:16px 0;border-top:1px solid ${B.lavender};border-bottom:1px solid ${B.lavender};">${text}</p>`;
}

function orderDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td style="font-size:12px;color:${B.muted};">Placed on <strong style="color:${B.sub};">${formatted}</strong></td></tr>
    </table>`;
}

function itemsTable(items?: OrderItem[]): string {
  if (!items || items.length === 0) return '';
  const rows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${B.lavender};font-size:14px;color:${B.text};">
        ${item.productName}
        <span style="color:${B.muted};font-size:12px;"> &times; ${item.quantity}</span>
      </td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${B.lavender};font-size:14px;font-weight:600;color:${B.text};white-space:nowrap;">
        $${item.totalPrice.toFixed(2)}
      </td>
    </tr>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
      <tr>
        <td style="padding:8px 0;border-bottom:2px solid ${B.indigo};font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Item</td>
        <td align="right" style="padding:8px 0;border-bottom:2px solid ${B.indigo};font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Price</td>
      </tr>
      ${rows}
    </table>`;
}

function priceBreakdown(order: OrderPayload): string {
  if (order.subtotal == null) return '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${B.muted};">Subtotal</td>
        <td align="right" style="padding:6px 0;font-size:13px;color:${B.sub};">$${order.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${B.muted};">Shipping${order.deliveryMethod ? ` (${order.deliveryMethod})` : ''}</td>
        <td align="right" style="padding:6px 0;font-size:13px;color:${B.sub};">${(order.deliveryFee ?? 0) === 0 ? '<span style="color:' + B.violet + ';font-weight:600;">FREE</span>' : '$' + (order.deliveryFee ?? 0).toFixed(2)}</td>
      </tr>
      ${(order.taxAmount ?? 0) > 0 ? `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${B.muted};">Tax</td>
        <td align="right" style="padding:6px 0;font-size:13px;color:${B.sub};">$${(order.taxAmount ?? 0).toFixed(2)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:10px 0;border-top:2px solid ${B.indigo};font-size:15px;font-weight:700;color:${B.text};">Total</td>
        <td align="right" style="padding:10px 0;border-top:2px solid ${B.indigo};font-size:15px;font-weight:700;color:${B.violet};">$${order.total.toFixed(2)}</td>
      </tr>
    </table>`;
}

function addressBlock(addr?: OrderAddress | null): string {
  if (!addr) return '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:16px;background:${B.pale};border-radius:8px;">
        <p style="margin:0 0 4px;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1.5px;">Shipping To</p>
        ${addr.recipientName ? `<p style="margin:0 0 2px;font-size:14px;font-weight:600;color:${B.text};">${addr.recipientName}</p>` : ''}
        <p style="margin:0;font-size:13px;color:${B.sub};line-height:1.6;">
          ${addr.addressLine1}${addr.addressLine2 ? `<br/>${addr.addressLine2}` : ''}<br/>
          ${addr.city}, ${addr.state} ${addr.zipCode}
        </p>
      </td></tr>
    </table>`;
}

// ─── Order Status Pipeline ──────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: 'pending_payment', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'dispatched', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function statusPipeline(currentStatus: string): string {
  const currentIdx = PIPELINE_STEPS.findIndex((s) => {
    if (currentStatus === 'packed') return s.key === 'processing';
    if (currentStatus === 'out_for_delivery') return s.key === 'dispatched';
    return s.key === currentStatus;
  });

  const dots = PIPELINE_STEPS.map((step, i) => {
    const isCompleted = i < currentIdx;
    const isCurrent = i === currentIdx;
    const labelColor = isCurrent ? B.violet : isCompleted ? B.sub : B.muted;
    const fontWeight = isCurrent ? '700' : '400';

    // Filled circle for completed/current, hollow for future
    const dot = isCompleted
      ? `<div style="width:20px;height:20px;border-radius:50%;background:${B.violet};margin:0 auto;">
           <table width="20" height="20" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="color:#fff;font-size:11px;line-height:20px;">&#10003;</td></tr></table>
         </div>`
      : isCurrent
      ? `<div style="width:20px;height:20px;border-radius:50%;background:${B.violet};margin:0 auto;">
           <table width="20" height="20" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="color:#fff;font-size:9px;line-height:20px;">&#9679;</td></tr></table>
         </div>`
      : `<div style="width:20px;height:20px;border-radius:50%;border:2px solid #d1d1d8;margin:0 auto;box-sizing:border-box;"></div>`;

    return `<td align="center" valign="top" style="padding:0 2px;">
      ${dot}
      <p style="margin:6px 0 0;font-size:10px;color:${labelColor};font-weight:${fontWeight};line-height:1.3;">${step.label}</p>
    </td>`;
  });

  // Build connector lines between dots
  const cells: string[] = [];
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    if (i > 0) {
      const lineColor = i <= currentIdx ? B.violet : '#d1d1d8';
      cells.push(`<td valign="top" style="padding-top:9px;"><div style="height:2px;background:${lineColor};width:100%;"></div></td>`);
    }
    cells.push(dots[i]);
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 28px;">
      <tr>
        ${cells.join('')}
      </tr>
    </table>`;
}

function cta(label: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
      <tr><td style="background:${B.violet};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 36px;color:${B.white};font-size:15px;font-weight:600;text-decoration:none;">${label}</a>
      </td></tr>
    </table>`;
}

// ─── Email content ──────────────────────────────────────────────────────────

function buildCustomerEmailSubject(type: CustomerNotificationType, orderNumber: string): string {
  const subjects: Record<CustomerNotificationType, string> = {
    'order.pending_payment': `Complete payment for ${orderNumber}`,
    'order.confirmed':       `Payment confirmed — ${orderNumber}`,
    'order.processing':      `${orderNumber} is being prepared`,
    'order.dispatched':      `${orderNumber} has shipped`,
    'order.delivered':       `${orderNumber} delivered`,
    'order.cancelled':       `${orderNumber} cancelled`,
  };
  return subjects[type];
}

function buildCustomerEmailBody(type: CustomerNotificationType, payload: CustomerNotificationPayload): string {
  const { customer, order, extra } = payload;
  const g = greeting(customer.name);
  const o = orderRow(order.orderNumber, order.total);
  const track = `${siteUrl()}/track/${order.orderNumber}`;

  // Map notification type to pipeline status key
  const statusForPipeline: Record<CustomerNotificationType, string> = {
    'order.pending_payment': 'pending_payment',
    'order.confirmed': 'confirmed',
    'order.processing': 'processing',
    'order.dispatched': 'dispatched',
    'order.delivered': 'delivered',
    'order.cancelled': '',
  };
  const pipeline = statusForPipeline[type] ? statusPipeline(statusForPipeline[type]) : '';

  // Rich detail blocks (only render if data is provided)
  const date = orderDate(order.orderDate);
  const items = itemsTable(order.items);
  const breakdown = priceBreakdown(order);
  const addr = addressBlock(order.deliveryAddress);

  const bodies: Record<CustomerNotificationType, string> = {
    'order.pending_payment': `
      ${heading('Complete Your Payment')}
      ${g}
      ${paragraph('Your order has been placed successfully! Please complete payment to begin processing.')}
      ${o}
      ${date}
      ${pipeline}
      ${note(`Send payment via <strong>Zelle</strong>, <strong>Venmo</strong>, or <strong>CashApp</strong> and include <strong style="color:${B.violet};">${order.orderNumber}</strong> in the memo.`)}
      ${items}
      ${breakdown}
      ${addr}
      ${paragraph('Once we verify your payment, we\'ll confirm your order and begin processing right away.')}
      ${cta('View Order & Pay', track)}
    `,
    'order.confirmed': `
      ${heading('Payment Confirmed')}
      ${g}
      ${paragraph(`Great news! We've received your payment${order.paymentMethod ? ` via <strong>${order.paymentMethod.replace('_', ' ')}</strong>` : ''}. Your order is confirmed and will be processed shortly.`)}
      ${o}
      ${date}
      ${pipeline}
      ${items}
      ${breakdown}
      ${addr}
      ${paragraph('We\'ll notify you with tracking information once your order ships.')}
      ${cta('Track Order', track)}
    `,
    'order.processing': `
      ${heading('Your Order Is Being Prepared')}
      ${g}
      ${paragraph('Your order is now being picked and carefully packed by our team.')}
      ${o}
      ${date}
      ${pipeline}
      ${items}
      ${breakdown}
      ${addr}
      ${paragraph('You\'ll receive an email with tracking details as soon as it ships.')}
      ${cta('Track Order', track)}
    `,
    'order.dispatched': `
      ${heading('Your Order Has Shipped!')}
      ${g}
      ${paragraph('Your order is on its way to you.')}
      ${o}
      ${date}
      ${pipeline}
      ${extra?.trackingNumber ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td style="padding:20px;background:${B.pale};border-radius:8px;">
            <p style="margin:0 0 4px;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1.5px;">Tracking Number</p>
            <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${B.violet};font-family:'Courier New',monospace;">${extra.trackingNumber}</p>
            ${extra.courierName ? `<p style="margin:0;font-size:13px;color:${B.sub};">Shipped via <strong>${extra.courierName}</strong></p>` : ''}
          </td></tr>
        </table>` : ''}
      ${items}
      ${breakdown}
      ${addr}
      ${cta('Track Shipment', track)}
    `,
    'order.delivered': `
      ${heading('Your Order Has Been Delivered!')}
      ${g}
      ${paragraph('Your order has been delivered. We hope everything is exactly what you expected!')}
      ${o}
      ${date}
      ${pipeline}
      ${items}
      ${breakdown}
      ${paragraph('Your feedback helps us improve. If you have a moment, we\'d love to hear from you.')}
      ${cta('Leave a Review', `${siteUrl()}/products`)}
    `,
    'order.cancelled': `
      ${heading('Order Cancelled')}
      ${g}
      ${paragraph('Your order has been cancelled. If a payment was made, a refund will be processed within 3-5 business days.')}
      ${o}
      ${date}
      ${items}
      ${breakdown}
      ${dangerNote(`If this cancellation was unexpected, please contact us at <a href="mailto:support@pharmos.com" style="color:${B.violet};font-weight:600;">support@pharmos.com</a> and we'll help resolve it.`)}
      ${cta('Browse Products', `${siteUrl()}/products`)}
    `,
  };

  return bodies[type];
}

function buildSmsText(type: CustomerNotificationType, payload: CustomerNotificationPayload): string | null {
  const { order, extra } = payload;
  const sms: Partial<Record<CustomerNotificationType, string>> = {
    'order.pending_payment': `Pharmos: Order ${order.orderNumber} placed ($${order.total.toFixed(2)}). Send payment via Zelle/Venmo/CashApp with your order number.`,
    'order.confirmed':       `Pharmos: Payment confirmed for ${order.orderNumber}. Processing soon.`,
    'order.dispatched':      `Pharmos: ${order.orderNumber} shipped.${extra?.trackingNumber ? ` Tracking: ${extra.trackingNumber}` : ''}`,
    'order.delivered':       `Pharmos: ${order.orderNumber} delivered. Thank you!`,
    'order.cancelled':       `Pharmos: ${order.orderNumber} cancelled. Questions? support@pharmos.com`,
  };
  return sms[type] ?? null;
}

// ─── Internal alerts ────────────────────────────────────────────────────────

function buildLowStockEmailBody(payload: LowStockAlertPayload): string {
  const rows = payload.items
    .map(
      (item) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${B.text};">${item.productName}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${item.currentStock === 0 ? B.danger : B.violet};font-weight:600;text-align:right;">${item.currentStock}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${B.muted};text-align:right;">${item.reorderPoint}</td>
      </tr>`
    )
    .join('');

  return `
    ${heading('Low Stock Alert')}
    ${paragraph(`<strong>${payload.items.length}</strong> product(s) at or below reorder point.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr style="border-bottom:2px solid ${B.indigo};">
        <th style="padding:10px 0;text-align:left;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Product</th>
        <th style="padding:10px 0;text-align:right;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Stock</th>
        <th style="padding:10px 0;text-align:right;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Reorder At</th>
      </tr>
      ${rows}
    </table>
    ${cta('Open Inventory', `${siteUrl()}/admin/inventory`)}
  `;
}

function buildExpiryEmailBody(payload: ExpiryAlertPayload): string {
  const label = payload.urgency === '30' ? 'URGENT' : payload.urgency === '60' ? 'WARNING' : 'NOTICE';
  const labelColor = payload.urgency === '30' ? B.danger : B.violet;

  const rows = payload.items
    .map((item) => {
      const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${B.text};">${item.productName}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${B.sub};font-family:'Courier New',monospace;">${item.batchNumber}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${daysLeft <= 30 ? B.danger : B.violet};font-weight:600;text-align:right;">${daysLeft}d</td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.lavender};font-size:15px;color:${B.muted};text-align:right;">${item.quantityOnHand}</td>
      </tr>`;
    })
    .join('');

  return `
    ${heading('Expiry Alert')}
    <p style="margin:0 0 24px;font-size:15px;color:${B.sub};line-height:1.7;">
      <span style="color:${labelColor};font-weight:600;">${label}:</span> ${payload.items.length} batch(es) expiring within ${payload.urgency} days.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr style="border-bottom:2px solid ${B.indigo};">
        <th style="padding:10px 0;text-align:left;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Product</th>
        <th style="padding:10px 0;text-align:left;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Batch</th>
        <th style="padding:10px 0;text-align:right;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Expires</th>
        <th style="padding:10px 0;text-align:right;font-size:11px;color:${B.muted};text-transform:uppercase;letter-spacing:1px;">Qty</th>
      </tr>
      ${rows}
    </table>
    ${cta('Open Inventory', `${siteUrl()}/admin/inventory`)}
  `;
}

// ─── Send ───────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'ndanwemarcel@gmail.com';
  const senderName = process.env.SENDER_NAME || 'Pharmos';

  if (!brevoApiKey) {
    console.warn('[notification] BREVO_API_KEY not set — email skipped:', subject);
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[notification] Brevo error:', res.status, body);
  } else {
    console.log('[notification] Email sent to', to, '—', subject);
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn('[notification] Twilio env vars not set — SMS skipped');
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ From: from, To: to, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[notification] Twilio error:', res.status, errBody);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const notificationService = {
  async send(type: CustomerNotificationType, payload: CustomerNotificationPayload): Promise<void> {
    const { customer, order } = payload;
    const subject = buildCustomerEmailSubject(type, order.orderNumber);
    const bodyHtml = buildCustomerEmailBody(type, payload);
    const html = wrapInBrandedTemplate(bodyHtml, subject);
    const smsText = buildSmsText(type, payload);

    const tasks: Promise<void>[] = [sendEmail(customer.email, subject, html)];
    if (smsText && customer.phone) {
      tasks.push(sendSms(customer.phone, smsText));
    }
    await Promise.allSettled(tasks);
  },

  async sendLowStockAlert(payload: LowStockAlertPayload): Promise<void> {
    const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
    if (!alertEmail) { console.warn('[notification] INTERNAL_ALERT_EMAIL not set'); return; }
    if (payload.items.length === 0) return;

    const outOfStock = payload.items.filter((i) => i.currentStock === 0).length;
    const subject = `Low Stock: ${payload.items.length} product(s)${outOfStock > 0 ? ` — ${outOfStock} out of stock` : ''}`;
    await sendEmail(alertEmail, subject, wrapInBrandedTemplate(buildLowStockEmailBody(payload), subject));
  },

  async sendExpiryAlert(payload: ExpiryAlertPayload): Promise<void> {
    const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
    if (!alertEmail) { console.warn('[notification] INTERNAL_ALERT_EMAIL not set'); return; }
    if (payload.items.length === 0) return;

    const pre = payload.urgency === '30' ? 'URGENT: ' : payload.urgency === '60' ? 'Warning: ' : '';
    const subject = `${pre}${payload.items.length} batch(es) expiring within ${payload.urgency} days`;
    await sendEmail(alertEmail, subject, wrapInBrandedTemplate(buildExpiryEmailBody(payload), subject));
  },
};
