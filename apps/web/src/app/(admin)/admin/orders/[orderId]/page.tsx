"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RefreshCw,
  Package,
  MapPin,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  User,
  Mail,
  Phone,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const PAYMENT_METHODS = [
  "zelle",
  "venmo",
  "cashapp",
  "wire_transfer",
  "check",
  "cash",
] as const;

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  subtotal: string;
  deliveryFee: string;
  taxAmount: string;
  deliveryMethod: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } | null;
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
  pending_payment: {
    label: "Pending Payment",
    color: "text-accent",
    bg: "bg-accent/5 border-accent/20",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: RefreshCw,
  },
  packed: {
    label: "Packed",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: Package,
  },
  dispatched: {
    label: "Dispatched",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: Truck,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
    icon: XCircle,
  },
};

const STATUS_FLOW = [
  "pending_payment",
  "confirmed",
  "processing",
  "packed",
  "dispatched",
  "out_for_delivery",
  "delivered",
];

const CARRIER_URLS: Record<string, (t: string) => string> = {
  usps: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`,
  ups: (t) => `https://www.ups.com/track?tracknum=${t}`,
  fedex: (t) => `https://www.fedex.com/fedextrack/?trknbr=${t}`,
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { getToken } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Confirm payment dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("zelle");
  const [providerRef, setProviderRef] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Update status dialog
  const [showStatus, setShowStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadOrder() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setOrder(data.data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function copyOrderNumber() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function submitConfirmPayment() {
    if (!order || !providerRef.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setConfirming(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/orders/${order.id}/confirm-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            paymentMethod,
            providerRef: providerRef.trim(),
            notes: confirmNotes || undefined,
          }),
        }
      );
      if (res.ok) {
        toast.success("Payment confirmed");
        setShowConfirm(false);
        loadOrder();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to confirm payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setConfirming(false);
    }
  }

  async function submitStatusUpdate() {
    if (!order || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const token = await getToken();
      const body: Record<string, string | undefined> = {
        status: newStatus,
        note: statusNote || undefined,
      };
      if (
        (newStatus === "dispatched" || newStatus === "out_for_delivery") &&
        trackingNumber.trim()
      ) {
        body.trackingNumber = trackingNumber.trim();
        body.courierName = courierName || undefined;
      }
      const res = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        setShowStatus(false);
        loadOrder();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!order) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-4 text-xl font-bold text-primary">
          Order not found
        </h1>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/admin/orders")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </Button>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
  const StatusIcon = status.icon;

  // Next valid status in pipeline
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatuses =
    currentIdx >= 0
      ? STATUS_FLOW.slice(currentIdx + 1)
      : [];
  const canCancel = order.status !== "delivered" && order.status !== "cancelled";

  const trackingUrl =
    order.trackingNumber && order.courierName
      ? CARRIER_URLS[order.courierName.toLowerCase()]?.(order.trackingNumber)
      : null;

  const customerName = order.customer
    ? [order.customer.firstName, order.customer.lastName]
        .filter(Boolean)
        .join(" ") || order.customer.email
    : "Guest";

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/orders")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">
              {order.orderNumber}
            </h1>
            <button
              onClick={copyOrderNumber}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="h-4 w-4 text-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Status badge */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${status.bg} ${status.color}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === "pending_payment" && (
          <Button
            size="sm"
            className="bg-accent text-white hover:bg-accent/90"
            onClick={() => {
              setPaymentMethod("zelle");
              setProviderRef("");
              setConfirmNotes("");
              setShowConfirm(true);
            }}
          >
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Confirm Payment
          </Button>
        )}
        {nextStatuses.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewStatus(nextStatuses[0]);
              setStatusNote("");
              setTrackingNumber(order.trackingNumber || "");
              setCourierName(order.courierName || "");
              setShowStatus(true);
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Update Status
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => {
              setNewStatus("cancelled");
              setStatusNote("");
              setShowStatus(true);
            }}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Cancel Order
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="space-y-5 lg:col-span-2">
          {/* Items */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold text-primary">
                Items ({order.items?.length ?? 0})
              </h2>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(item.unitPrice).toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      ${Number(item.totalPrice).toFixed(2)}
                    </span>
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
                  <span>
                    {Number(order.deliveryFee) === 0
                      ? "FREE"
                      : `$${Number(order.deliveryFee).toFixed(2)}`}
                  </span>
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

          {/* Tracking */}
          {order.trackingNumber && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold">
                        Tracking: {order.trackingNumber}
                      </p>
                      {order.courierName && (
                        <p className="text-xs capitalize text-muted-foreground">
                          {order.courierName}
                        </p>
                      )}
                    </div>
                  </div>
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Track{" "}
                        <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-semibold text-primary">Timeline</h2>
                <div className="space-y-0">
                  {order.timeline.map((event, i) => {
                    const evtStatus = STATUS_CONFIG[event.toStatus];
                    const EvtIcon = evtStatus?.icon || Clock;
                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              i === 0
                                ? "bg-accent/10 text-accent"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <EvtIcon className="h-3.5 w-3.5" />
                          </div>
                          {i < order.timeline.length - 1 && (
                            <div className="mt-1 h-6 w-px bg-border" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p
                            className={`text-sm font-medium ${
                              i === 0
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {evtStatus?.label || event.toStatus}
                          </p>
                          {event.note && (
                            <p className="text-xs text-muted-foreground">
                              {event.note}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/60">
                            {new Date(event.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
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
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-5">
          {/* Customer */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold text-primary">Customer</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{customerName}</span>
                </div>
                {order.customer?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-accent hover:underline"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                )}
                {order.customer?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-accent hover:underline"
                    >
                      {order.customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <h2 className="font-semibold text-primary">
                    Shipping Address
                  </h2>
                </div>
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  {order.shippingAddress.recipientName && (
                    <p className="font-medium text-foreground">
                      {order.shippingAddress.recipientName}
                    </p>
                  )}
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && (
                    <p>{order.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.zipCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-semibold text-primary">Payment</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      order.paymentStatus === "paid" ? "default" : "outline"
                    }
                  >
                    {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">
                    ${Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
                {order.deliveryMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="capitalize">{order.deliveryMethod}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Payment Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirm Payment — {order.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      paymentMethod === m
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Payment Reference{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Zelle confirmation ID..."
                value={providerRef}
                onChange={(e) => setProviderRef(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Notes (optional)
              </label>
              <Input
                placeholder="Any notes..."
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
              />
            </div>
            <div className="rounded-lg border bg-secondary/30 px-4 py-3 text-sm">
              <p className="font-medium">
                Amount: ${Number(order.totalAmount).toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This will move the order to &ldquo;Confirmed&rdquo; and notify
                the customer.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitConfirmPayment}
              disabled={!providerRef.trim() || confirming}
              className="bg-accent text-white hover:bg-accent/90"
            >
              {confirming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatus} onOpenChange={setShowStatus}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                New Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(newStatus === "cancelled"
                  ? ["cancelled"]
                  : nextStatuses
                ).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        newStatus === s
                          ? `${cfg?.bg || "bg-secondary"} ${cfg?.color || ""}`
                          : "border-border text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      {cfg?.label || s}
                    </button>
                  );
                })}
              </div>
            </div>

            {(newStatus === "dispatched" ||
              newStatus === "out_for_delivery") && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Tracking Number
                  </label>
                  <Input
                    placeholder="Enter tracking number..."
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Courier
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["USPS", "UPS", "FedEx"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCourierName(c.toLowerCase())}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          courierName === c.toLowerCase()
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-accent/50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Note (optional)
              </label>
              <Input
                placeholder="Add a note..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatus(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitStatusUpdate}
              disabled={!newStatus || updatingStatus}
              className={
                newStatus === "cancelled"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-accent text-white hover:bg-accent/90"
              }
            >
              {updatingStatus && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {newStatus === "cancelled" ? "Cancel Order" : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
