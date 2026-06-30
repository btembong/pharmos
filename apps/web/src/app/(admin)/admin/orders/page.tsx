"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  CheckCircle,
  Loader2,
  Eye,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
  ShoppingCart,
  ArrowRight,
  CreditCard,
  User,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  pending_payment: {
    label: "Pending Payment",
    color: "text-accent",
    bg: "bg-accent/5 border-accent/20",
    dot: "bg-accent",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    icon: RefreshCw,
  },
  packed: {
    label: "Packed",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    dot: "bg-indigo-500",
    icon: Package,
  },
  dispatched: {
    label: "Dispatched",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
    icon: Truck,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    dot: "bg-purple-500",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-destructive",
    bg: "bg-destructive/5 border-destructive/20",
    dot: "bg-red-400",
    icon: XCircle,
  },
};

const TABS = [
  { id: "pending_payment", label: "Pending", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "processing", label: "Processing", icon: RefreshCw },
  { id: "dispatched", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
  { id: "all", label: "All", icon: ShoppingCart },
];

const PAYMENT_METHODS = [
  "zelle",
  "venmo",
  "cashapp",
  "wire_transfer",
  "check",
  "cash",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  customer?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  items: { id: string; quantity: number; productName: string }[];
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}

function AdminOrdersContent() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("status") || "pending_payment";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  // Confirm payment dialog
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("zelle");
  const [providerRef, setProviderRef] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const loadOrders = useCallback(
    async (status?: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await getToken();
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const params = new URLSearchParams({ limit: "50" });
        if (status && status !== "all") params.set("status", status);
        const res = await fetch(`${API_URL}/api/orders?${params}`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.data || []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken]
  );

  // Load tab counts on mount
  useEffect(() => {
    async function loadCounts() {
      try {
        const token = await getToken();
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const res = await fetch(`${API_URL}/api/reports/summary`, { headers });
        if (res.ok) {
          const data = await res.json();
          const o = data.data?.orders;
          if (o) {
            setTabCounts({
              pending_payment: o.pendingPayment ?? 0,
              confirmed: o.confirmed ?? 0,
              processing: o.processing ?? 0,
              dispatched: o.dispatched ?? 0,
              delivered: o.delivered ?? 0,
              cancelled: o.cancelled ?? 0,
              all: o.total ?? 0,
            });
          }
        }
      } catch {}
    }
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrders(activeTab);
  }, [activeTab, loadOrders]);

  // Filter by search
  const filtered = searchQuery.trim()
    ? orders.filter((o) => {
        const q = searchQuery.toLowerCase();
        const name = o.customer
          ? [o.customer.firstName, o.customer.lastName]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
          : "";
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          name.includes(q) ||
          (o.customer?.email || "").toLowerCase().includes(q)
        );
      })
    : orders;

  function openConfirmDialog(order: Order) {
    setConfirmOrder(order);
    setPaymentMethod("zelle");
    setProviderRef("");
    setConfirmNotes("");
  }

  async function submitConfirmPayment() {
    if (!confirmOrder || !providerRef.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setConfirming(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/orders/${confirmOrder.id}/confirm-payment`,
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
        toast.success(`Payment confirmed for ${confirmOrder.orderNumber}`);
        setConfirmOrder(null);
        loadOrders(activeTab);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to confirm payment");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage orders, confirm payments, and track fulfillment
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadOrders(activeTab, true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border bg-white text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Orders list */}
      <div className="mt-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-16">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Loading orders...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60">
                <ClipboardList className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                {searchQuery
                  ? "No orders match your search"
                  : "No orders in this category"}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px]">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[200px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const statusCfg = STATUS_CONFIG[order.status] ??
                      STATUS_CONFIG.pending_payment;
                    const StatusIcon = statusCfg.icon;
                    const customerName = order.customer
                      ? [order.customer.firstName, order.customer.lastName]
                          .filter(Boolean)
                          .join(" ") || order.customer.email
                      : "Guest";
                    const itemCount = order.items?.reduce(
                      (s, i) => s + i.quantity,
                      0
                    );
                    const itemSummary =
                      order.items?.length === 1
                        ? order.items[0].productName
                        : `${order.items?.length || 0} products`;

                    return (
                      <TableRow
                        key={order.id}
                        className="group cursor-pointer transition-colors hover:bg-secondary/40"
                        onClick={() =>
                          router.push(`/admin/orders/${order.id}`)
                        }
                      >
                        {/* Order # + date */}
                        <TableCell>
                          <p className="font-mono text-sm font-semibold text-accent">
                            {order.orderNumber}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {customerName}
                              </p>
                              {order.customer?.email &&
                                customerName !== order.customer.email && (
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {order.customer.email}
                                  </p>
                                )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Items */}
                        <TableCell>
                          <p className="truncate text-sm">{itemSummary}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {itemCount} item{itemCount !== 1 ? "s" : ""}
                          </p>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                        </TableCell>

                        {/* Payment */}
                        <TableCell>
                          {order.paymentStatus === "paid" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Unpaid
                            </span>
                          )}
                        </TableCell>

                        {/* Total */}
                        <TableCell className="text-right">
                          <span className="text-sm font-bold text-primary">
                            ${Number(order.totalAmount).toFixed(2)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.status === "pending_payment" && (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5 bg-accent text-white hover:bg-accent/90"
                                onClick={() => openConfirmDialog(order)}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">
                                  Confirm
                                </span>
                              </Button>
                            )}
                            <Link href={`/admin/orders/${order.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">View</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Payment Dialog */}
      <Dialog
        open={!!confirmOrder}
        onOpenChange={(open) => {
          if (!open) setConfirmOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirm Payment — {confirmOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Amount banner */}
            <div className="flex items-center gap-3 rounded-xl bg-accent/5 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <CreditCard className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary">
                  ${Number(confirmOrder?.totalAmount ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Amount to confirm</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
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
                placeholder="e.g. Zelle confirmation ID, last 4 of transfer..."
                value={providerRef}
                onChange={(e) => setProviderRef(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The confirmation number / transaction ID from the payment.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Notes (optional)
              </label>
              <Input
                placeholder="Any notes about this payment..."
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
              />
            </div>

            <div className="rounded-lg border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
              Confirming will move the order to &ldquo;Confirmed&rdquo; and
              send an email + SMS notification to the customer.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>
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
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
