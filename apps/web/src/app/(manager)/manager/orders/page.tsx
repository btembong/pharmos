"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Loader2,
  Search,
  DollarSign,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_TABS = [
  { key: "pending_payment", label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", activeBg: "bg-amber-500" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", activeBg: "bg-green-500" },
  { key: "processing", label: "Processing", icon: Package, color: "text-blue-600", bg: "bg-blue-50", activeBg: "bg-blue-500" },
  { key: "dispatched", label: "Shipped", icon: Truck, color: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-500" },
] as const;

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  customer?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  items: { id: string; quantity: number; productName: string }[];
}

export default function ManagerPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("pending_payment");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async (status: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders?status=${status}&limit=30`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  const loadCounts = useCallback(async () => {
    try {
      const token = await getToken();
      const results: Record<string, number> = {};
      await Promise.all(
        STATUS_TABS.map(async (t) => {
          const res = await fetch(`${API_URL}/api/orders?status=${t.key}&limit=1`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            results[t.key] = data.meta?.total ?? (data.data?.length ?? 0);
          }
        })
      );
      setCounts(results);
    } catch {
      // silent
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) {
      loadOrders(tab);
      loadCounts();
    }
  }, [isSignedIn, tab, loadOrders, loadCounts]);

  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => {
      loadOrders(tab, false);
      loadCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn, tab, loadOrders, loadCounts]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7371FC]" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7371FC]/10">
          <AlertCircle className="h-8 w-8 text-[#7371FC]" />
        </div>
        <p className="mt-4 text-lg font-bold text-[#010128]">Sign in required</p>
        <p className="mt-1 text-sm text-gray-500">You need a staff account to access the manager portal.</p>
        <button
          onClick={() => router.push("/sign-in?redirect_url=/manager")}
          className="mt-6 rounded-xl bg-[#7371FC] px-8 py-3 text-sm font-semibold text-white active:scale-[0.97]"
        >
          Sign In
        </button>
      </div>
    );
  }

  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        const name = o.customer
          ? [o.customer.firstName, o.customer.lastName].filter(Boolean).join(" ")
          : "";
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          (o.customer?.email || "").toLowerCase().includes(q)
        );
      })
    : orders;

  const totalPendingCount = counts["pending_payment"] || 0;

  return (
    <div className="pb-4">
      {/* Pending alert banner */}
      {totalPendingCount > 0 && tab !== "pending_payment" && (
        <button
          onClick={() => setTab("pending_payment")}
          className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left w-[calc(100%-1.5rem)]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-700">{totalPendingCount} order{totalPendingCount !== 1 ? "s" : ""} awaiting payment</p>
            <p className="text-[10px] text-amber-500">Tap to review</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-400" />
        </button>
      )}

      {/* Search bar */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#010128] placeholder:text-gray-400 outline-none focus:border-[#7371FC] focus:ring-2 focus:ring-[#7371FC]/10"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {STATUS_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-[#7371FC] text-white shadow-sm shadow-[#7371FC]/20"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : t.color}`} />
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={`ml-0.5 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[10px] font-bold leading-none ${
                  active ? "bg-white/25 text-white" : `${t.bg} ${t.color}`
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => { loadOrders(tab, false); loadCounts(); }}
          className="ml-auto shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-400 hover:text-[#7371FC] active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#7371FC]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Package className="h-8 w-8 text-gray-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-400">
            {search ? "No orders match your search" : "No orders in this tab"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-2 text-xs text-[#7371FC] hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2 px-3">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((order) => {
            const customerName = order.customer
              ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email
              : "Guest";
            const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
            const firstProduct = order.items[0]?.productName || "Unknown";
            const age = getAge(order.createdAt);
            const tabConfig = STATUS_TABS.find((t) => t.key === order.status);

            return (
              <button
                key={order.id}
                onClick={() => router.push(`/manager/${order.id}`)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm border border-gray-100 transition-all active:scale-[0.98] hover:shadow-md hover:border-[#7371FC]/20"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tabConfig?.bg || "bg-gray-100"}`}>
                  {(() => {
                    const StatusIcon = tabConfig?.icon || Package;
                    return <StatusIcon className={`h-4 w-4 ${tabConfig?.color || "text-gray-500"}`} />;
                  })()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#010128]">{order.orderNumber}</span>
                    {order.status === "pending_payment" && order.paymentStatus !== "paid" && (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-200">
                        UNPAID
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{customerName}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="truncate max-w-[120px]">{firstProduct}{itemCount > 1 ? ` +${itemCount - 1}` : ""}</span>
                    <span className="shrink-0">&#183;</span>
                    <span className="shrink-0">{age}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#7371FC]">
                    ${Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-[#7371FC] transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getAge(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
