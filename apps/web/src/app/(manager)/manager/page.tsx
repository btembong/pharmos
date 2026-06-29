"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Truck,
  ChevronRight,
  CreditCard,
  ArrowRight,
  Eye,
} from "lucide-react";
import { PushNotificationPrompt } from "@/components/manager/push-prompt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  pendingPayment: number;
  confirmed: number;
  processing: number;
  dispatched: number;
  todayOrders: number;
  todayRevenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  customer?: { firstName?: string | null; lastName?: string | null; email: string } | null;
  items: { id: string; quantity: number; productName: string }[];
}

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  pending_payment: { label: "PENDING", icon: Clock },
  confirmed: { label: "CONFIRMED", icon: CheckCircle },
  processing: { label: "PROCESSING", icon: Package },
  packed: { label: "PACKED", icon: Package },
  dispatched: { label: "SHIPPED", icon: Truck },
  out_for_delivery: { label: "OUT", icon: Truck },
  delivered: { label: "DELIVERED", icon: CheckCircle },
};

export default function ManagerHomePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [summaryRes, pendingRes, confirmedRes, processingRes, dispatchedRes, recentRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/summary`, { headers }),
        fetch(`${API_URL}/api/orders?status=pending_payment&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=confirmed&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=processing&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=dispatched&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?limit=5&sort=createdAt:desc`, { headers }),
      ]);

      const summary = summaryRes.ok ? await summaryRes.json() : { data: {} };
      const pending = pendingRes.ok ? await pendingRes.json() : { meta: { total: 0 } };
      const confirmed = confirmedRes.ok ? await confirmedRes.json() : { meta: { total: 0 } };
      const processing = processingRes.ok ? await processingRes.json() : { meta: { total: 0 } };
      const dispatched = dispatchedRes.ok ? await dispatchedRes.json() : { meta: { total: 0 } };
      const recent = recentRes.ok ? await recentRes.json() : { data: [] };

      const s = summary.data || {};
      setStats({
        totalRevenue: Number(s.totalRevenue || 0),
        totalOrders: Number(s.totalOrders || 0),
        todayOrders: Number(s.todayOrders || 0),
        todayRevenue: Number(s.todayRevenue || 0),
        pendingPayment: pending.meta?.total ?? 0,
        confirmed: confirmed.meta?.total ?? 0,
        processing: processing.meta?.total ?? 0,
        dispatched: dispatched.meta?.total ?? 0,
      });
      setRecentOrders(recent.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) loadData();
  }, [isSignedIn, loadData]);

  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, [isSignedIn, loadData]);

  if (!isLoaded || loading) {
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
          <Package className="h-8 w-8 text-[#7371FC]" />
        </div>
        <p className="mt-4 text-lg font-bold text-[#010128]">Sign in required</p>
        <p className="mt-1 text-sm text-[#010128]/50">You need a staff account to access the manager portal.</p>
        <button
          onClick={() => router.push("/sign-in?redirect_url=/manager")}
          className="mt-6 rounded-xl bg-[#7371FC] px-8 py-3 text-sm font-semibold text-white active:scale-[0.97]"
        >
          Sign In
        </button>
      </div>
    );
  }

  const pendingCount = stats?.pendingPayment || 0;
  const activeOrders = (stats?.confirmed || 0) + (stats?.processing || 0) + (stats?.dispatched || 0);

  return (
    <div className="px-3 pb-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[#010128]">Home</h1>
        <button
          onClick={() => loadData(false)}
          className="rounded-xl border border-[#010128]/10 bg-white p-2 text-[#010128]/30 hover:text-[#7371FC] active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Urgent: Pending payments */}
      {pendingCount > 0 && (
        <button
          onClick={() => router.push("/manager/orders?status=pending_payment")}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[#7371FC]/5 border border-[#7371FC]/15 px-4 py-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7371FC]/10">
            <CreditCard className="h-5 w-5 text-[#7371FC]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#010128]">{pendingCount} payment{pendingCount !== 1 ? "s" : ""} to confirm</p>
            <p className="text-xs text-[#010128]/40">Tap to review pending orders</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#7371FC]/40" />
        </button>
      )}

      {/* Push notification prompt */}
      <PushNotificationPrompt />

      {/* Today's card */}
      <div className="rounded-2xl bg-[#010128] p-5 mb-4 shadow-lg shadow-[#010128]/15">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Today&apos;s Revenue</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7371FC]/20">
            <TrendingUp className="h-4 w-4 text-[#7371FC]" />
          </div>
        </div>
        <p className="mt-2 text-3xl font-bold text-white">${stats?.todayRevenue?.toFixed(2) || "0.00"}</p>
        <p className="mt-1 text-xs text-white/40">{stats?.todayOrders || 0} order{(stats?.todayOrders || 0) !== 1 ? "s" : ""} placed today</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="Revenue" value={`$${formatCompact(stats?.totalRevenue || 0)}`} icon={DollarSign} />
        <MiniStat label="Orders" value={String(stats?.totalOrders || 0)} icon={ShoppingCart} />
        <MiniStat label="Active" value={String(activeOrders)} icon={Package} />
      </div>

      {/* Quick actions */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#010128]/30">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <QuickAction icon={Clock} label="Pending Orders" count={stats?.pendingPayment || 0} onClick={() => router.push("/manager/orders?status=pending_payment")} />
        <QuickAction icon={CheckCircle} label="Confirmed" count={stats?.confirmed || 0} onClick={() => router.push("/manager/orders?status=confirmed")} />
        <QuickAction icon={Package} label="Processing" count={stats?.processing || 0} onClick={() => router.push("/manager/orders?status=processing")} />
        <QuickAction icon={Truck} label="Dispatched" count={stats?.dispatched || 0} onClick={() => router.push("/manager/orders?status=dispatched")} />
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#010128]/30">Recent Orders</p>
        <button onClick={() => router.push("/manager/orders")} className="flex items-center gap-1 text-xs font-semibold text-[#7371FC]">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {recentOrders.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#010128]/5 p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-[#010128]/10" />
          <p className="mt-3 text-sm text-[#010128]/30">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentOrders.map((order) => {
            const name = order.customer
              ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email
              : "Guest";
            const age = getAge(order.createdAt);
            const cfg = STATUS_MAP[order.status] || { label: order.status.toUpperCase(), icon: Package };
            const StatusIcon = cfg.icon;

            return (
              <button
                key={order.id}
                onClick={() => router.push(`/manager/${order.id}`)}
                className="group flex w-full items-center gap-3 rounded-xl bg-white p-3.5 text-left border border-[#010128]/5 transition-all active:scale-[0.98] hover:border-[#7371FC]/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7371FC]/8">
                  <StatusIcon className="h-4 w-4 text-[#7371FC]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#010128]">{order.orderNumber}</span>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-[#7371FC]/8 text-[#7371FC]">
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#010128]/40 truncate">{name} &middot; {age}</p>
                </div>
                <p className="text-sm font-bold text-[#010128]">${Number(order.totalAmount).toFixed(2)}</p>
                <Eye className="h-4 w-4 shrink-0 text-[#010128]/15 group-hover:text-[#7371FC]" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl bg-white border border-[#010128]/5 p-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#7371FC]/8">
        <Icon className="h-3.5 w-3.5 text-[#7371FC]" />
      </div>
      <p className="mt-2 text-base font-bold text-[#010128]">{value}</p>
      <p className="text-[10px] text-[#010128]/35">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, count, onClick }: {
  icon: React.ElementType; label: string; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl bg-white border border-[#010128]/5 p-3.5 text-left transition-all active:scale-[0.97] hover:border-[#7371FC]/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7371FC]/8">
        <Icon className="h-4 w-4 text-[#7371FC]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#010128]">{label}</p>
        <p className={`text-lg font-bold ${count > 0 ? "text-[#7371FC]" : "text-[#010128]/20"}`}>{count}</p>
      </div>
    </button>
  );
}

function getAge(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatCompact(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(2);
}
