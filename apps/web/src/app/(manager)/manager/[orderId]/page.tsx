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
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_FLOW = [
  { key: "pending_payment", label: "Pending Payment" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
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
        toast.success("Payment confirmed! Customer notified.");
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
        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
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
        <button onClick={() => router.back()} className="rounded-full bg-white/8 p-2 text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-mono text-lg font-bold text-white">{order.orderNumber}</h1>
          <p className="text-xs text-white/40">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Status badge + total */}
      <div className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-white/6 p-4">
        <div>
          <p className="text-xs text-white/40">Status</p>
          <p className="mt-0.5 text-sm font-bold capitalize text-white">{order.status.replace(/_/g, " ")}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Total</p>
          <p className="mt-0.5 text-lg font-bold text-[#A594F9]">${Number(order.totalAmount).toFixed(2)}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mx-4 mt-3 flex gap-2">
        {order.status === "pending_payment" && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7371FC] py-3 text-sm font-semibold text-white active:scale-[0.98]"
          >
            <CheckCircle className="h-4 w-4" />
            Confirm Payment
          </button>
        )}
        {nextStatuses.length > 0 && order.status !== "pending_payment" && (
          <button
            onClick={() => { setNewStatus(nextStatuses[0].key); setShowStatusUpdate(true); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white active:scale-[0.98]"
          >
            <Truck className="h-4 w-4" />
            Update Status
          </button>
        )}
      </div>

      {/* Payment proof */}
      {order.payment?.proofUrl && (
        <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <ImageIcon className="h-3.5 w-3.5" />
            Payment Proof
          </div>
          <a
            href={order.payment.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-xs text-[#7371FC] hover:underline"
          >
            View proof <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Customer */}
      <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-4">
        <p className="text-xs font-semibold text-white/60 mb-2">Customer</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-white">
            <User className="h-3.5 w-3.5 text-white/30" />
            {customerName}
          </div>
          {order.customer?.email && (
            <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-sm text-[#A594F9]">
              <Mail className="h-3.5 w-3.5 text-white/30" />
              {order.customer.email}
            </a>
          )}
          {order.customer?.phone && (
            <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-sm text-[#A594F9]">
              <Phone className="h-3.5 w-3.5 text-white/30" />
              {order.customer.phone}
            </a>
          )}
        </div>
      </div>

      {/* Shipping address */}
      {order.deliveryAddress && (
        <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60 mb-2">
            <MapPin className="h-3.5 w-3.5" />
            Ship To
          </div>
          <p className="text-sm text-white">{order.deliveryAddress.recipientName}</p>
          <p className="text-xs text-white/50">{order.deliveryAddress.addressLine1}</p>
          {order.deliveryAddress.addressLine2 && (
            <p className="text-xs text-white/50">{order.deliveryAddress.addressLine2}</p>
          )}
          <p className="text-xs text-white/50">
            {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-4">
        <p className="text-xs font-semibold text-white/60 mb-2">Items ({order.items.length})</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{item.productName}</p>
                <p className="text-xs text-white/40">Qty: {item.quantity} × ${Number(item.unitPrice).toFixed(2)}</p>
              </div>
              <p className="ml-2 text-sm font-semibold text-white">${Number(item.totalPrice).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-white/50">
          <div className="flex justify-between"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>${Number(order.deliveryFee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>${Number(order.taxAmount).toFixed(2)}</span></div>
          <div className="flex justify-between text-sm font-bold text-white">
            <span>Total</span><span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-4">
          <p className="text-xs font-semibold text-white/60 mb-1">Tracking</p>
          <p className="font-mono text-sm text-white">{order.trackingNumber}</p>
          {order.courierName && <p className="text-xs text-white/40">{order.courierName}</p>}
        </div>
      )}

      {/* Confirm Payment Sheet */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowConfirm(false)}>
          <div
            className="w-full max-w-lg rounded-t-3xl bg-[#1a1a3e] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h3 className="text-lg font-bold text-white">Confirm Payment</h3>
            <p className="mt-0.5 text-xs text-white/50">
              This will mark the order as paid and notify the customer.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">Method</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
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
                <label className="mb-1 block text-xs font-semibold text-white/60">Reference *</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7371FC]"
                  placeholder="Zelle confirmation ID..."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>
              <button
                onClick={confirmPayment}
                disabled={confirming || !payRef.trim()}
                className="w-full rounded-xl bg-[#7371FC] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {confirming ? "Confirming..." : `Confirm Payment — $${Number(order.totalAmount).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Sheet */}
      {showStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowStatusUpdate(false)}>
          <div
            className="w-full max-w-lg rounded-t-3xl bg-[#1a1a3e] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h3 className="text-lg font-bold text-white">Update Status</h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">New Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {nextStatuses.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setNewStatus(s.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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
                    <label className="mb-1 block text-xs font-semibold text-white/60">Tracking Number</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7371FC]"
                      placeholder="1Z999AA10123456784"
                      value={trackingNum}
                      onChange={(e) => setTrackingNum(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-white/60">Courier</label>
                    <div className="flex gap-1.5">
                      {["USPS", "UPS", "FedEx"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setCourier(c)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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
                className="w-full rounded-xl bg-[#7371FC] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {updatingStatus ? "Updating..." : `Update to ${newStatus.replace(/_/g, " ")}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
