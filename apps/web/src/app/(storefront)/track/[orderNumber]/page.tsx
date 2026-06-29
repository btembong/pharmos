import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ExternalLink,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { TrackingCopyButton } from "@/components/storefront/tracking-copy-button";
import { ClaimPaidButton } from "@/components/storefront/claim-paid-button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryAddress {
  recipientName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
}

interface TrackingData {
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  deliveryAddress: DeliveryAddress | null;
  timeline: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    desc: string;
    icon: typeof Package;
    color: string;
    bg: string;
    dotBg: string;
    pulse: boolean;
  }
> = {
  pending_payment: {
    label: "Awaiting Payment",
    desc: "Your order is placed. Send payment to begin processing.",
    icon: CreditCard,
    color: "text-accent",
    bg: "bg-accent/5 border-accent/20",
    dotBg: "bg-accent",
    pulse: true,
  },
  confirmed: {
    label: "Payment Confirmed",
    desc: "We've received your payment. Your order is queued for processing.",
    icon: CheckCircle2,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dotBg: "bg-blue-500",
    pulse: false,
  },
  processing: {
    label: "Processing",
    desc: "Our team is preparing your order.",
    icon: RefreshCw,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dotBg: "bg-blue-500",
    pulse: true,
  },
  packed: {
    label: "Packed",
    desc: "Your order is packed and ready to hand off to the carrier.",
    icon: Package,
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    dotBg: "bg-indigo-500",
    pulse: false,
  },
  dispatched: {
    label: "Dispatched",
    desc: "Your order is on its way.",
    icon: Truck,
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    dotBg: "bg-violet-500",
    pulse: true,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    desc: "Your order is with the delivery driver today.",
    icon: Truck,
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    dotBg: "bg-purple-500",
    pulse: true,
  },
  delivered: {
    label: "Delivered",
    desc: "Your order has been delivered.",
    icon: CheckCircle2,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    dotBg: "bg-green-500",
    pulse: false,
  },
  cancelled: {
    label: "Cancelled",
    desc: "This order has been cancelled.",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    dotBg: "bg-red-400",
    pulse: false,
  },
};

// ─── Progress pipeline ────────────────────────────────────────────────────────

const PIPELINE = [
  { id: "pending_payment", label: "Payment", icon: CreditCard },
  { id: "confirmed",       label: "Confirmed", icon: CheckCircle2 },
  { id: "processing",      label: "Processing", icon: RefreshCw },
  { id: "dispatched",      label: "Shipped", icon: Truck },
  { id: "delivered",       label: "Delivered", icon: CheckCircle2 },
] as const;

const PIPELINE_ORDER = PIPELINE.map((s) => s.id);

function getPipelineIndex(status: string): number {
  // Map packed → processing, out_for_delivery → dispatched
  const normalised: Record<string, string> = {
    packed: "processing",
    out_for_delivery: "dispatched",
  };
  return PIPELINE_ORDER.indexOf((normalised[status] ?? status) as never);
}

function OrderProgress({ status }: { status: string }) {
  const cancelled = status === "cancelled";
  const currentIdx = getPipelineIndex(status);

  return (
    <div className="relative flex items-start justify-between px-1 sm:px-2">
      {/* connector line */}
      <div className="absolute left-5 right-5 top-4 h-0.5 bg-border sm:left-6 sm:right-6 sm:top-5" />
      <div
        className={`absolute left-5 top-4 h-0.5 transition-all duration-500 sm:left-6 sm:top-5 ${
          cancelled ? "bg-destructive/40" : "bg-accent"
        }`}
        style={{
          width:
            currentIdx <= 0
              ? "0%"
              : `${Math.min(100, (currentIdx / (PIPELINE.length - 1)) * 100)}%`,
          right: "auto",
        }}
      />

      {PIPELINE.map((step, i) => {
        const done = !cancelled && i < currentIdx;
        const active = !cancelled && i === currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-1" style={{ maxWidth: "60px" }}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-10 sm:w-10 ${
                cancelled
                  ? "border-border bg-background text-muted-foreground/30"
                  : done
                  ? "border-accent bg-accent text-white"
                  : active
                  ? "border-accent bg-accent text-white ring-4 ring-accent/20"
                  : "border-border bg-background text-muted-foreground/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span
              className={`text-center text-[9px] font-medium leading-tight sm:text-[10px] ${
                cancelled
                  ? "text-muted-foreground/30"
                  : done || active
                  ? "text-accent"
                  : "text-muted-foreground/50"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  let tracking: TrackingData | null = null;
  let fetchError = false;

  try {
    const result = await apiClient<{ data: TrackingData }>(
      `/api/orders/track/${orderNumber}`
    );
    tracking = result.data;
  } catch {
    fetchError = true;
  }

  // ─── Not found ──────────────────────────────────────────────────────────────

  if (fetchError || !tracking) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60">
          <AlertCircle className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h1 className="text-xl font-bold text-primary">Order Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find order{" "}
          <span className="font-mono font-semibold text-foreground">{orderNumber}</span>.
          Check the number and try again, or contact support.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/account/orders">
            <Button variant="outline">My Orders</Button>
          </Link>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@pharmos.com" className="text-accent hover:underline">
            support@pharmos.com
          </a>
        </p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[tracking.status] ?? STATUS_CONFIG.processing;
  const StatusIcon = cfg.icon;
  const cancelled = tracking.status === "cancelled";

  // Sort timeline oldest → newest for display
  const timeline = [...tracking.timeline].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/account/orders"
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        My Orders
      </Link>

      {/* Page title */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">Track Order</h1>
        <span className="font-mono text-sm text-muted-foreground">
          {tracking.orderNumber}
        </span>
      </div>

      {/* ── Progress stepper ── */}
      <Card className="mt-5 overflow-hidden">
        <CardContent className="p-6 pb-7">
          <OrderProgress status={tracking.status} />
        </CardContent>
      </Card>

      {/* ── Status hero ── */}
      <div className={`mt-4 rounded-xl border p-5 ${cfg.bg}`}>
        <div className="flex items-start gap-4">
          <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${cfg.color}`}
          >
            {cfg.pulse && (
              <span className={`absolute inset-0 animate-ping rounded-full opacity-30 ${cfg.dotBg}`} />
            )}
            <StatusIcon className="relative h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className={`text-base font-bold ${cfg.color}`}>{cfg.label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{cfg.desc}</p>

            {tracking.estimatedDelivery && tracking.status !== "delivered" && !cancelled && (
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated delivery:</span>
                <span className="font-semibold text-foreground">
                  {new Date(tracking.estimatedDelivery).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {tracking.deliveredAt && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  Delivered{" "}
                  {new Date(tracking.deliveredAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pending payment instructions ── */}
      {tracking.status === "pending_payment" && (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b bg-accent/5 px-5 py-3">
            <p className="text-sm font-semibold text-accent">
              Action Required — Send Payment
            </p>
          </div>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground">
              Send payment to any method below and include{" "}
              <span className="font-mono font-bold text-foreground">
                {tracking.orderNumber}
              </span>{" "}
              in the memo.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { icon: "💚", label: "Zelle", handle: "payments@pharmos.com" },
                { icon: "💙", label: "Venmo", handle: "@Pharmos" },
                { icon: "💵", label: "CashApp", handle: "$Pharmos" },
                { icon: "🏦", label: "Wire", handle: "Acct: 1234567890" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <span className="text-base">{m.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{m.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {m.handle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <ClaimPaidButton orderNumber={tracking.orderNumber} />
          </CardContent>
        </Card>
      )}

      {/* ── Tracking number card ── */}
      {tracking.trackingNumber && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tracking Number
                </p>
                <p className="mt-1 font-mono text-base font-bold text-foreground">
                  {tracking.trackingNumber}
                </p>
                {tracking.courierName && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    {tracking.courierName}
                  </div>
                )}
              </div>
              <TrackingCopyButton text={tracking.trackingNumber} />
            </div>

            {tracking.trackingUrl && (
              <a
                href={tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Track on {tracking.courierName ?? "Carrier"} Website
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Delivery address ── */}
      {tracking.deliveryAddress && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin className="h-4 w-4 text-accent" />
              Delivering to
            </div>
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {tracking.deliveryAddress.recipientName && (
                <p className="font-medium text-foreground">
                  {tracking.deliveryAddress.recipientName}
                </p>
              )}
              <p>{tracking.deliveryAddress.addressLine1}</p>
              {tracking.deliveryAddress.addressLine2 && (
                <p>{tracking.deliveryAddress.addressLine2}</p>
              )}
              <p>
                {tracking.deliveryAddress.city},{" "}
                {tracking.deliveryAddress.state}{" "}
                {tracking.deliveryAddress.zipCode}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Timeline ── */}
      {timeline.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="mb-5 text-sm font-semibold text-primary">Order Timeline</p>
            <div className="space-y-0">
              {timeline.map((event, i) => {
                const isLatest = i === timeline.length - 1;
                const eventCfg = STATUS_CONFIG[event.toStatus];
                const EventIcon = eventCfg?.icon ?? Package;
                const date = new Date(event.createdAt);

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Dot + connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                          isLatest
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {isLatest && eventCfg?.pulse && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
                        )}
                        <EventIcon className="relative h-3.5 w-3.5" />
                      </div>
                      {i < timeline.length - 1 && (
                        <div className="my-1 h-8 w-px bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-4">
                      <p
                        className={`text-sm font-semibold ${
                          isLatest ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {eventCfg?.label ?? event.toStatus.replace(/_/g, " ")}
                      </p>
                      {event.note && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {event.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground/60">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {date.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CTAs ── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/account/orders" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Package className="h-4 w-4" />
            My Orders
          </Button>
        </Link>
        <Link href="/products" className="flex-1">
          <Button className="w-full gap-2">
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Questions about your order?{" "}
        <a href="mailto:support@pharmos.com" className="text-accent hover:underline">
          support@pharmos.com
        </a>
      </p>
    </div>
  );
}
