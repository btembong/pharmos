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
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_TABS = [
  { key: "pending_payment", label: "Pending", icon: Clock, color: "text-amber-400" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-green-400" },
  { key: "processing", label: "Processing", icon: Package, color: "text-blue-400" },
  { key: "dispatched", label: "Shipped", icon: Truck, color: "text-purple-400" },
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

  // Auto-refresh every 30 seconds
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
        <AlertCircle className="h-12 w-12 text-[#7371FC]/40" />
        <p className="mt-4 text-lg font-bold text-white">Sign in required</p>
        <p className="mt-1 text-sm text-white/50">You need a staff account to access the manager portal.</p>
        <button
          onClick={() => router.push("/sign-in?redirect_url=/manager")}
          className="mt-6 rounded-xl bg-[#7371FC] px-6 py-3 text-sm font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto px-3 pt-4 pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {STATUS_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-[#7371FC] text-white"
                  : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/70"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : t.color}`} />
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20" : "bg-white/10"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => { loadOrders(tab, false); loadCounts(); }}
          className="ml-auto shrink-0 rounded-full bg-white/8 p-2 text-white/40 hover:text-white/70"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#7371FC]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-white/10" />
          <p className="mt-3 text-sm text-white/40">No orders in this tab</p>
        </div>
      ) : (
        <div className="mt-2 space-y-2 px-3">
          {orders.map((order) => {
            const customerName = order.customer
              ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email
              : "Guest";
            const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
            const age = getAge(order.createdAt);

            return (
              <button
                key={order.id}
                onClick={() => router.push(`/manager/${order.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/6 p-4 text-left transition-all active:scale-[0.98] hover:bg-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{order.orderNumber}</span>
                    {order.status === "pending_payment" && order.paymentStatus !== "paid" && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        UNPAID
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/50 truncate">{customerName}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-white/30">
                    <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                    <span>{age}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#A594F9]">
                    ${Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
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
