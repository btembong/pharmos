"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  RefreshCw,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_TABS = [
  { key: "pending_payment", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "dispatched", label: "Shipped", icon: Truck },
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

export default function ManagerOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#7371FC]" /></div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending_payment";

  const [tab, setTab] = useState(initialStatus);
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

  return (
    <div className="pb-4">
      {/* Search bar */}
      <div className="px-3 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#010128]/30" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#010128]/10 bg-white py-2.5 pl-9 pr-3 text-sm text-[#010128] placeholder:text-[#010128]/30 outline-none focus:border-[#7371FC] focus:ring-2 focus:ring-[#7371FC]/10"
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
                  : "bg-white text-[#010128]/50 border border-[#010128]/10 hover:border-[#7371FC]/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={`ml-0.5 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[10px] font-bold leading-none ${
                  active ? "bg-white/25 text-white" : "bg-[#7371FC]/10 text-[#7371FC]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => { loadOrders(tab, false); loadCounts(); }}
          className="ml-auto shrink-0 rounded-xl border border-[#010128]/10 bg-white p-2.5 text-[#010128]/30 hover:text-[#7371FC] active:scale-95"
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#010128]/5">
            <Package className="h-8 w-8 text-[#010128]/15" />
          </div>
          <p className="mt-4 text-sm font-medium text-[#010128]/30">
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
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#010128]/20">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((order) => {
            const customerName = order.customer
              ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email
              : "Guest";
            const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
            const firstProduct = order.items[0]?.productName || "Unknown";
            const age = getAge(order.createdAt);

            return (
              <button
                key={order.id}
                onClick={() => router.push(`/manager/${order.id}`)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left border border-[#010128]/5 transition-all active:scale-[0.98] hover:border-[#7371FC]/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7371FC]/8">
                  {(() => {
                    const StatusIcon = STATUS_TABS.find((t) => t.key === order.status)?.icon || Package;
                    return <StatusIcon className="h-4 w-4 text-[#7371FC]" />;
                  })()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#010128]">{order.orderNumber}</span>
                    {order.status === "pending_payment" && order.paymentStatus !== "paid" && (
                      <span className="rounded-md bg-[#7371FC]/8 px-1.5 py-0.5 text-[10px] font-bold text-[#7371FC] border border-[#7371FC]/15">
                        UNPAID
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#010128]/40 truncate">{customerName}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#010128]/25">
                    <span className="truncate max-w-[120px]">{firstProduct}{itemCount > 1 ? ` +${itemCount - 1}` : ""}</span>
                    <span className="shrink-0">&#183;</span>
                    <span className="shrink-0">{age}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#010128]">${Number(order.totalAmount).toFixed(2)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#010128]/15 group-hover:text-[#7371FC] transition-colors" />
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
  return `${Math.floor(hours / 24)}d ago`;
}
