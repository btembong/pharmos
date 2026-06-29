"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RefreshCw,
  MapPin,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  subtotal: string;
  deliveryFee: string;
  taxAmount: string;
  deliveryMethod: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }[];
  shippingAddress: {
    recipientName: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  timeline: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pending_payment: { label: "Awaiting Payment", color: "text-accent", bg: "bg-accent/5 border-accent/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2 },
  processing: { label: "Processing", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: RefreshCw },
  packed: { label: "Packed", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Package },
  dispatched: { label: "Dispatched", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", icon: XCircle },
};

const CARRIER_URLS: Record<string, (t: string) => string> = {
  usps: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`,
  ups: (t) => `https://www.ups.com/track?tracknum=${t}`,
  fedex: (t) => `https://www.fedex.com/fedextrack/?trknbr=${t}`,
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const { getToken } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/orders/track/${orderNumber}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Order not found");
        const data = await res.json();
        setOrder(data.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-4 text-xl font-bold text-primary">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "We couldn't find this order."}</p>
        <Link href="/account/orders">
          <Button variant="outline" className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Orders
          </Button>
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
  const StatusIcon = status.icon;

  const trackingUrl = order.trackingNumber && order.courierName
    ? CARRIER_URLS[order.courierName.toLowerCase()]?.(order.trackingNumber)
    : null;

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(order!.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-primary sm:text-xl">{order.orderNumber}</h1>
              <button onClick={copyOrderNumber} className="shrink-0 text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Placed {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="mt-3 ml-12">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${status.bg} ${status.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tracking */}
        {order.trackingNumber && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Tracking: {order.trackingNumber}</p>
                    {order.courierName && (
                      <p className="text-xs text-muted-foreground capitalize">{order.courierName}</p>
                    )}
                  </div>
                </div>
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Track <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 font-semibold text-primary">Items ({order.items?.length ?? 0})</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      ${Number(item.unitPrice).toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">${Number(item.totalPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{Number(order.deliveryFee) === 0 ? "FREE" : `$${Number(order.deliveryFee).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>${Number(order.taxAmount).toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-primary">
                <span>Total</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" />
                <h2 className="font-semibold text-primary">Shipping Address</h2>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {order.shippingAddress.recipientName && (
                  <p className="font-medium text-foreground">{order.shippingAddress.recipientName}</p>
                )}
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold text-primary">Order Timeline</h2>
              <div className="space-y-0">
                {order.timeline.map((event, i) => {
                  const evtStatus = STATUS_CONFIG[event.toStatus];
                  const EvtIcon = evtStatus?.icon || Clock;
                  return (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${i === 0 ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                          <EvtIcon className="h-3.5 w-3.5" />
                        </div>
                        {i < order.timeline.length - 1 && <div className="mt-1 h-6 w-px bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                          {evtStatus?.label || event.toStatus}
                        </p>
                        {event.note && (
                          <p className="text-xs text-muted-foreground">{event.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(event.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
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
      </div>
    </div>
  );
}
