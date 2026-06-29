"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
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
} from "lucide-react";

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

export default function ManagerDashboardPage() {
  const { isSignedIn, getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [summaryRes, pendingRes, confirmedRes, processingRes, dispatchedRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/summary`, { headers }),
        fetch(`${API_URL}/api/orders?status=pending_payment&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=confirmed&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=processing&limit=1`, { headers }),
        fetch(`${API_URL}/api/orders?status=dispatched&limit=1`, { headers }),
      ]);

      const summary = summaryRes.ok ? await summaryRes.json() : { data: {} };
      const pending = pendingRes.ok ? await pendingRes.json() : { meta: { total: 0 } };
      const confirmed = confirmedRes.ok ? await confirmedRes.json() : { meta: { total: 0 } };
      const processing = processingRes.ok ? await processingRes.json() : { meta: { total: 0 } };
      const dispatched = dispatchedRes.ok ? await dispatchedRes.json() : { meta: { total: 0 } };

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
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) loadStats();
  }, [isSignedIn, loadStats]);

  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => loadStats(false), 60000);
    return () => clearInterval(interval);
  }, [isSignedIn, loadStats]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7371FC]" />
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[#010128]">Dashboard</h1>
        <button
          onClick={() => loadStats(false)}
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-400 hover:text-[#7371FC] active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Today's highlight */}
      <div className="rounded-2xl bg-gradient-to-br from-[#7371FC] to-[#5855d4] p-5 mb-4 shadow-lg shadow-[#7371FC]/15">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Today</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-white">${stats?.todayRevenue?.toFixed(2) || "0.00"}</p>
            <p className="mt-1 text-xs text-white/60">{stats?.todayOrders || 0} order{(stats?.todayOrders || 0) !== 1 ? "s" : ""} today</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${stats?.totalRevenue?.toFixed(2) || "0.00"}`}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={String(stats?.totalOrders || 0)}
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      {/* Order pipeline */}
      <div className="mb-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Order Pipeline</p>
        <div className="space-y-2">
          <PipelineRow icon={Clock} label="Pending Payment" count={stats?.pendingPayment || 0} color="text-amber-600" bg="bg-amber-50" urgent />
          <PipelineRow icon={CheckCircle} label="Confirmed" count={stats?.confirmed || 0} color="text-green-600" bg="bg-green-50" />
          <PipelineRow icon={Package} label="Processing" count={stats?.processing || 0} color="text-blue-600" bg="bg-blue-50" />
          <PipelineRow icon={Truck} label="Dispatched" count={stats?.dispatched || 0} color="text-purple-600" bg="bg-purple-50" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-3 text-lg font-bold text-[#010128]">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{label}</p>
    </div>
  );
}

function PipelineRow({ icon: Icon, label, count, color, bg, urgent }: {
  icon: React.ElementType; label: string; count: number; color: string; bg: string; urgent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${
      urgent && count > 0 ? "bg-amber-50 border border-amber-200" : "bg-white border border-gray-100 shadow-sm"
    }`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1.5">
        {urgent && count > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        <span className={`min-w-[28px] rounded-lg px-2 py-1 text-center text-xs font-bold ${
          count > 0 ? `${bg} ${color}` : "bg-gray-50 text-gray-300"
        }`}>
          {count}
        </span>
      </div>
    </div>
  );
}
