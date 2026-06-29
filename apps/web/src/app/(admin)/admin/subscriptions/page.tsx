"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

interface Sub {
  id: string;
  status: string;
  quantity: number;
  frequencyDays: number;
  nextOrderDate: string;
  totalOrders: number;
  discountPercent: string | null;
  createdAt: string;
  customer?: { firstName: string | null; lastName: string | null; email: string };
  product?: { name: string; slug: string };
}

export default function AdminSubscriptionsPage() {
  const { getToken } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/subscriptions/admin/all?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setSubs(data.data);
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          All customer auto-refill subscriptions
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Customer</th>
              <th className="px-4 py-2.5 text-left font-medium">Product</th>
              <th className="px-4 py-2.5 text-left font-medium">Qty</th>
              <th className="px-4 py-2.5 text-left font-medium">Frequency</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Next Order</th>
              <th className="px-4 py-2.5 text-left font-medium">Total Orders</th>
              <th className="px-4 py-2.5 text-left font-medium">Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {subs.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <p className="font-medium">
                    {[sub.customer?.firstName, sub.customer?.lastName].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{sub.customer?.email}</p>
                </td>
                <td className="px-4 py-2.5">{sub.product?.name || "—"}</td>
                <td className="px-4 py-2.5">{sub.quantity}</td>
                <td className="px-4 py-2.5">Every {sub.frequencyDays} days</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status] || ""}`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {sub.status === "active" ? new Date(sub.nextOrderDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5">{sub.totalOrders}</td>
                <td className="px-4 py-2.5">{sub.discountPercent ? `${sub.discountPercent}%` : "—"}</td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No subscriptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
