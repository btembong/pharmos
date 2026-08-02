"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  ArrowRight,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  itemCount?: number;
}

type FilterTab = "all" | "active" | "delivered" | "cancelled";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType; dot: string }
> = {
  pending_payment: {
    label: "Awaiting Payment",
    color: "text-accent",
    bg: "bg-accent/5 border-accent/20",
    icon: Clock,
    dot: "bg-accent",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
    dot: "bg-blue-400",
  },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: RefreshCw,
    dot: "bg-blue-400",
  },
  packed: {
    label: "Packed",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: Package,
    dot: "bg-indigo-400",
  },
  dispatched: {
    label: "Dispatched",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: Truck,
    dot: "bg-violet-400",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
    dot: "bg-purple-400",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
    dot: "bg-red-400",
  },
};

const ACTIVE_STATUSES = new Set([
  "pending_payment", "confirmed", "processing", "packed", "dispatched", "out_for_delivery",
]);

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border bg-muted/20 p-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-6 w-24 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    icon: AlertCircle,
    dot: "bg-muted-foreground",
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccountOrdersPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      try {
        const token = await getToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${API_URL}/api/orders/my`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const result = await res.json();
          setOrders(result.data ?? []);
        }
      } catch {
        // API not running — show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <OrderSkeleton />
      </div>
    );
  }

  // ─── Filter ─────────────────────────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ACTIVE_STATUSES.has(o.status);
    if (activeTab === "delivered") return o.status === "delivered";
    if (activeTab === "cancelled") return o.status === "cancelled";
    return true;
  });

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: orders.length },
    { id: "active", label: "Active", count: orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length },
    { id: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "delivered").length },
    { id: "cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "cancelled").length },
  ];

  // ─── Summary stats ───────────────────────────────────────────────────────────

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;

  // ─── Empty state ─────────────────────────────────────────────────────────────

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60">
          <ShoppingBag className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-primary">No orders yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order history will appear here once you place your first order.
        </p>
        <Link href="/products">
          <Button className="mt-6">Browse Products</Button>
        </Link>
      </div>
    );
  }

  // ─── Orders list ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">My Orders</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Orders", value: String(orders.length) },
          { label: "Active Orders", value: String(activeCount) },
          { label: "Total Spent", value: `$${totalSpent.toFixed(2)}` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-muted/20 px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-lg font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "border bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.id
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Order cards */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No {activeTab !== "all" ? activeTab : ""} orders found.
          </div>
        ) : (
          filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const isActive = ACTIVE_STATUSES.has(order.status);
            return (
              <Card
                key={order.id}
                className="group overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Left color bar */}
                    <div
                      className={`w-1 shrink-0 ${cfg?.dot ?? "bg-border"}`}
                    />

                    <div className="flex flex-1 flex-col gap-3 p-5 sm:flex-row sm:items-center">
                      {/* Icon + order info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-primary">
                            {order.orderNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {order.itemCount
                              ? ` · ${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {/* Status + amount + CTA */}
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="flex flex-col items-start gap-1.5 sm:items-end">
                          <StatusBadge status={order.status} />
                          <p className="text-sm font-bold text-foreground">
                            ${Number(order.totalAmount).toFixed(2)}
                          </p>
                        </div>

                        <Link href={`/track/${order.orderNumber}`}>
                          <Button
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="shrink-0 gap-1.5"
                          >
                            {isActive ? "Track" : "View"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
