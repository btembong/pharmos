"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  User,
  Mail,
  Phone,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Clock,
  CreditCard,
  Box,
  CircleDot,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_FLOW = [
  { key: "pending_payment", label: "Pending Payment", icon: Clock, color: "text-amber-400" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-green-400" },
  { key: "processing", label: "Processing", icon: Package, color: "text-blue-400" },
  { key: "packed", label: "Packed", icon: Box, color: "text-indigo-400" },
  { key: "dispatched", label: "Dispatched", icon: Truck, color: "text-purple-400" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck, color: "text-violet-400" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-emerald-400" },
];

const PAYMENT_METHODS = ["zelle", "venmo", "cashapp", "wire_transfer", "check", "cash"] as const;

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalAmount: string;
  subtotal: string;
  deliveryFee: string;
  taxAmount: string;
  deliveryMethod: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  notes: string | null;
  createdAt: string;
  customer?: {
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  deliveryAddress?: {
    recipientName: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  items: {
    id: string;
    productName: string;
    productSlug: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }[];
  payment?: {
    proofUrl: string | null;
  } | null;
}

export default function ManagerOrderDetailPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirm payment state
  const [showConfirm, setShowConfirm] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("zelle");
  const [payRef, setPayRef] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Status update state
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNum, setTrackingNum] = useState("");
  const [courier, setCourier] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orderId, getToken]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function confirmPayment() {
    if (!payRef.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setConfirming(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentMethod: payMethod, providerRef: payRef.trim() }),
      });
      if (res.ok) {
        toast.success("Payment confirmed!");
        setShowConfirm(false);
        loadOrder();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to confirm");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setConfirming(false);
    }
  }

  async function updateStatus() {
    if (!newStatus) return;
    setUpdatingStatus(true);
    try {
      const token = await getToken();
      const body: Record<string, string> = { status: newStatus };
      if (trackingNum) body.trackingNumber = trackingNum;
      if (courier) body.courierName = courier;
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
        setShowStatusUpdate(false);
        loadOrder();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7371FC]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-white/50">Order not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#7371FC]">Go back</button>
      </div>
    );
  }

  const customerName = order.customer
    ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email
    : "Guest";

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);
  const nextStatuses = STATUS_FLOW.slice(currentIdx + 1).filter((s) => s.key !== "out_for_delivery" || order.status === "dispatched");

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => router.back()} className="rounded-xl bg-white/8 p-2.5 text-white/60 hover:text-white active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-mono text-lg font-bold text-white">{order.orderNumber}</h1>
          <p className="text-xs text-white/40">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#A594F9]">${Number(order.totalAmount).toFixed(2)}</p>
          <p className={`text-[10px] font-bold ${order.paymentStatus === "paid" ? "text-green-400" : "text-amber-400"}`}>
            {order.paymentStatus === "paid" ? "PAID" : "UNPAID"}
          </p>
        </div>
      </div>

      {/* Status timeline */}
      <div className="mx-4 mt-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">Status Timeline</p>
        <div className="space-y-0">
          {STATUS_FLOW.map((step, i) => {
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-400" />
                  ) : isCurrent ? (
                    <CircleDot className={`h-5 w-5 shrink-0 ${step.color}`} />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-white/15" />
                  )}
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`w-px flex-1 min-h-[20px] ${isCompleted ? "bg-green-400/30" : "bg-white/10"}`} />
                  )}
                </div>
                {/* Label */}
                <div className={`pb-4 ${isFuture ? "opacity-30" : ""}`}>
                  <p className={`text-sm font-medium ${isCurrent ? "text-white" : isCompleted ? "text-white/60" : "text-white/30"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mx-4 mt-3 flex gap-2">
        {order.status === "pending_payment" && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7371FC] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7371FC]/20 active:scale-[0.97]"
          >
            <CreditCard className="h-4 w-4" />
            Confirm Payment
          </button>
        )}
        {nextStatuses.length > 0 && order.status !== "pending_payment" && (
          <button
            onClick={() => { setNewStatus(nextStatuses[0].key); setShowStatusUpdate(true); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-3.5 text-sm font-semibold text-white active:scale-[0.97]"
          >
            <Truck className="h-4 w-4" />
            Update Status
          </button>
        )}
      </div>

      {/* Payment proof */}
      {order.payment?.proofUrl && (
        <Section title="Payment Proof" icon={ImageIcon}>
          <a
            href={order.payment.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#7371FC] hover:underline"
          >
            View uploaded proof <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Section>
      )}

      {/* Customer */}
      <Section title="Customer" icon={User}>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-white">
            <User className="h-4 w-4 text-white/25" />
            {customerName}
          </div>
          {order.customer?.email && (
            <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2.5 text-sm text-[#A594F9]">
              <Mail className="h-4 w-4 text-white/25" />
              {order.customer.email}
            </a>
          )}
          {order.customer?.phone && (
            <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2.5 text-sm text-[#A594F9]">
              <Phone className="h-4 w-4 text-white/25" />
              {order.customer.phone}
            </a>
          )}
        </div>
      </Section>

      {/* Shipping address */}
      {order.deliveryAddress && (
        <Section title="Ship To" icon={MapPin}>
          <p className="text-sm font-medium text-white">{order.deliveryAddress.recipientName}</p>
          <p className="mt-1 text-xs text-white/50">{order.deliveryAddress.addressLine1}</p>
          {order.deliveryAddress.addressLine2 && (
            <p className="text-xs text-white/50">{order.deliveryAddress.addressLine2}</p>
          )}
          <p className="text-xs text-white/50">
            {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
          </p>
        </Section>
      )}

      {/* Items */}
      <Section title={`Items (${order.items.length})`} icon={Package}>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                <p className="mt-0.5 text-xs text-white/35">Qty: {item.quantity} x ${Number(item.unitPrice).toFixed(2)}</p>
              </div>
              <p className="ml-3 text-sm font-semibold text-white">${Number(item.totalPrice).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
          <SummaryRow label="Subtotal" value={order.subtotal} />
          <SummaryRow label="Shipping" value={order.deliveryFee} />
          <SummaryRow label="Tax" value={order.taxAmount} />
          <div className="flex justify-between pt-1 text-sm font-bold text-white">
            <span>Total</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </Section>

      {/* Tracking */}
      {order.trackingNumber && (
        <Section title="Tracking" icon={Truck}>
          <p className="font-mono text-sm text-white">{order.trackingNumber}</p>
          {order.courierName && <p className="mt-1 text-xs text-white/40">via {order.courierName}</p>}
        </Section>
      )}

      {/* Notes */}
      {order.notes && (
        <Section title="Notes" icon={Package}>
          <p className="text-sm text-white/70">{order.notes}</p>
        </Section>
      )}

      {/* Confirm Payment Sheet */}
      {showConfirm && (
        <BottomSheet onClose={() => setShowConfirm(false)}>
          <h3 className="text-lg font-bold text-white">Confirm Payment</h3>
          <p className="mt-1 text-xs text-white/40">
            This will mark <span className="text-white/60 font-mono">{order.orderNumber}</span> as paid and notify the customer.
          </p>

          <div className="mt-2 rounded-xl bg-[#7371FC]/10 border border-[#7371FC]/20 p-3 text-center">
            <p className="text-2xl font-bold text-[#A594F9]">${Number(order.totalAmount).toFixed(2)}</p>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/50">Payment Method</label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      payMethod === m
                        ? "bg-[#7371FC] text-white"
                        : "bg-white/8 text-white/50 hover:bg-white/15"
                    }`}
                  >
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-white/50">Reference / Confirmation ID *</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7371FC] placeholder:text-white/25"
                placeholder="e.g. Zelle confirmation #..."
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>
            <button
              onClick={confirmPayment}
              disabled={confirming || !payRef.trim()}
              className="w-full rounded-xl bg-[#7371FC] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7371FC]/20 disabled:opacity-50 active:scale-[0.97]"
            >
              {confirming ? "Confirming..." : "Confirm Payment"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Status Update Sheet */}
      {showStatusUpdate && (
        <BottomSheet onClose={() => setShowStatusUpdate(false)}>
          <h3 className="text-lg font-bold text-white">Update Status</h3>
          <p className="mt-1 text-xs text-white/40">
            Move <span className="text-white/60 font-mono">{order.orderNumber}</span> to the next stage.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/50">New Status</label>
              <div className="flex flex-wrap gap-1.5">
                {nextStatuses.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setNewStatus(s.key)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      newStatus === s.key
                        ? "bg-[#7371FC] text-white"
                        : "bg-white/8 text-white/50 hover:bg-white/15"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {(newStatus === "dispatched" || newStatus === "out_for_delivery") && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white/50">Tracking Number</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#7371FC] placeholder:text-white/25"
                    placeholder="1Z999AA10123456784"
                    value={trackingNum}
                    onChange={(e) => setTrackingNum(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/50">Courier</label>
                  <div className="flex gap-1.5">
                    {["USPS", "UPS", "FedEx"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCourier(c)}
                        className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                          courier === c
                            ? "bg-[#7371FC] text-white"
                            : "bg-white/8 text-white/50 hover:bg-white/15"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={updateStatus}
              disabled={updatingStatus || !newStatus}
              className="w-full rounded-xl bg-[#7371FC] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7371FC]/20 disabled:opacity-50 active:scale-[0.97]"
            >
              {updatingStatus ? "Updating..." : `Update to ${newStatus.replace(/_/g, " ")}`}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-white/30" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-white/40">
      <span>{label}</span>
      <span>${Number(value).toFixed(2)}</span>
    </div>
  );
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-[#0d0d2b] border-t border-white/10 p-6 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        {children}
      </div>
    </div>
  );
}
