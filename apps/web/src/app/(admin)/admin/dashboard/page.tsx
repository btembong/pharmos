"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Loader,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowRight,
  Eye,
  CreditCard,
  Boxes,
  Users,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Stats {
  orders: {
    total: number;
    pendingPayment: number;
    confirmed: number;
    processing: number;
    dispatched: number;
    delivered: number;
    cancelled: number;
  };
  revenue: { total: number; today: number; paymentCount: number };
  products: { total: number; active: number };
  inventory: {
    totalBatches: number;
    lowStock: number;
    outOfStock: number;
    expiringSoon: number;
  };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending_payment: {
    label: "Pending",
    className: "bg-accent/10 text-accent border-accent/20",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: RefreshCw,
  },
  packed: {
    label: "Packed",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Package,
  },
  dispatched: {
    label: "Dispatched",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/5 text-destructive border-destructive/20",
    icon: XCircle,
  },
};

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      try {
        const token = await getToken();
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [statsRes, ordersRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/reports/summary`, { headers }),
          fetch(`${API_URL}/api/orders?limit=8`, { headers }),
        ]);

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const data = await statsRes.value.json();
          setStats(data.data);
        }

        if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          setRecentOrders(data.data || []);
        }

        setLastRefresh(new Date());
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => load(), 60000);
    return () => clearInterval(interval);
  }, [load]);

  // ─── Quick Stats Bar ──────────────────────────────────────────────────────────
  const activeOrders =
    (stats?.orders.pendingPayment ?? 0) +
    (stats?.orders.confirmed ?? 0) +
    (stats?.orders.processing ?? 0) +
    (stats?.orders.dispatched ?? 0);

  const quickStats = [
    {
      label: "Pending Payment",
      value: stats?.orders.pendingPayment ?? 0,
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
      href: "/admin/orders?status=pending_payment",
    },
    {
      label: "Active Orders",
      value: activeOrders,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/admin/orders",
    },
    {
      label: "Today's Revenue",
      value: stats ? `$${stats.revenue.today.toFixed(2)}` : "$0.00",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/admin/payments",
    },
    {
      label: "Low Stock",
      value: (stats?.inventory.lowStock ?? 0) + (stats?.inventory.outOfStock ?? 0),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/admin/inventory",
    },
  ];

  // ─── Order Pipeline ────────────────────────────────────────────────────────────
  const pipeline = [
    { label: "Pending", count: stats?.orders.pendingPayment ?? 0, color: "bg-accent", icon: Clock },
    { label: "Confirmed", count: stats?.orders.confirmed ?? 0, color: "bg-blue-500", icon: CheckCircle2 },
    { label: "Processing", count: stats?.orders.processing ?? 0, color: "bg-indigo-500", icon: RefreshCw },
    { label: "Dispatched", count: stats?.orders.dispatched ?? 0, color: "bg-violet-500", icon: Truck },
    { label: "Delivered", count: stats?.orders.delivered ?? 0, color: "bg-emerald-500", icon: CheckCircle2 },
    { label: "Cancelled", count: stats?.orders.cancelled ?? 0, color: "bg-red-400", icon: XCircle },
  ];

  const pipelineTotal = pipeline.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <div>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last updated{" "}
            {lastRefresh.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Quick Stats Strip */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((qs) => {
          const Icon = qs.icon;
          return (
            <Link key={qs.label} href={qs.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${qs.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${qs.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{qs.label}</p>
                    {loading ? (
                      <Loader className="mt-1 h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <p className="text-xl font-bold text-primary">
                        {qs.value}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Order Pipeline — visual bar chart */}
      {stats && (
        <Card className="mt-5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Order Pipeline
              </CardTitle>
              <Link
                href="/admin/orders"
                className="text-xs text-accent hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stacked bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
              {pipeline
                .filter((p) => p.count > 0)
                .map((p) => (
                  <div
                    key={p.label}
                    className={`${p.color} transition-all duration-500`}
                    style={{
                      width: `${(p.count / pipelineTotal) * 100}%`,
                    }}
                  />
                ))}
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {pipeline.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.label} className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${p.color}`}
                      />
                      <span className="text-lg font-bold text-primary">
                        {p.count}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Icon className="h-2.5 w-2.5" />
                      {p.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid — Revenue + Products + Inventory */}
      {stats && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold text-primary">
                    ${stats.revenue.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                {stats.revenue.paymentCount} confirmed payments
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-lg font-bold text-primary">
                    {stats.orders.total}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                {stats.orders.delivered} delivered
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <Package className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-lg font-bold text-primary">
                    {stats.products.active}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-3 w-3" />
                {stats.products.total} total ({stats.products.active} active)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Inventory Alerts
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {stats.inventory.lowStock +
                      stats.inventory.outOfStock +
                      stats.inventory.expiringSoon}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                {stats.inventory.outOfStock > 0 && (
                  <p className="text-destructive">
                    {stats.inventory.outOfStock} out of stock
                  </p>
                )}
                {stats.inventory.lowStock > 0 && (
                  <p>
                    {stats.inventory.lowStock} low stock
                  </p>
                )}
                {stats.inventory.expiringSoon > 0 && (
                  <p>
                    {stats.inventory.expiringSoon} expiring (30d)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "View Pending Orders",
            desc: "Orders awaiting payment",
            icon: Clock,
            href: "/admin/orders?status=pending_payment",
            color: "text-accent",
            bg: "bg-accent/5 border-accent/20 hover:bg-accent/10",
          },
          {
            label: "Add New Product",
            desc: "Create a product listing",
            icon: Package,
            href: "/admin/products",
            color: "text-violet-600",
            bg: "bg-violet-50/50 border-violet-200 hover:bg-violet-50",
          },
          {
            label: "Manage Inventory",
            desc: "Stock levels & batches",
            icon: Boxes,
            href: "/admin/inventory",
            color: "text-blue-600",
            bg: "bg-blue-50/50 border-blue-200 hover:bg-blue-50",
          },
          {
            label: "View Customers",
            desc: "Customer accounts",
            icon: Users,
            href: "/admin/customers",
            color: "text-emerald-600",
            bg: "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50",
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${action.bg}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${action.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card className="mt-5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Recent Orders
            </CardTitle>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => {
                  const badge =
                    STATUS_BADGE[order.status] || STATUS_BADGE.pending_payment;
                  const Icon = badge.icon;
                  return (
                    <TableRow key={order.id} className="group">
                      <TableCell className="font-mono text-sm font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${badge.className}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(order.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/orders/${order.id}`}>
                          <button className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
