"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pause, Play, X, RefreshCw, Package } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Subscription {
  id: string;
  status: string;
  quantity: number;
  frequencyDays: number;
  nextOrderDate: string;
  lastOrderDate: string | null;
  totalOrders: number;
  discountPercent: string | null;
  product?: { name: string; slug: string; images?: { url: string; alt: string; isPrimary: boolean }[] | null };
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  paused: { label: "Paused", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function MySubscriptionsPage() {
  const { getToken } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/subscriptions/me`, {
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

  async function handleAction(id: string, action: "pause" | "resume" | "cancel") {
    setActionLoading(id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/subscriptions/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(action === "pause" ? { pauseDays: 30 } : {}),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Subscription ${action === "cancel" ? "cancelled" : action === "pause" ? "paused" : "resumed"}`);
      fetchSubs();
    } catch {
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">My Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your auto-refill subscriptions. Save 5% on every recurring order.
        </p>
      </div>

      {subs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">No Subscriptions Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up auto-refill on any product to save 5% and never run out.
            </p>
            <Link href="/products">
              <Button className="mt-4">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subs.map((sub) => {
            const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.active;
            const primaryImage = sub.product?.images?.find((i) => i.isPrimary) || sub.product?.images?.[0];
            return (
              <Card key={sub.id}>
                <CardContent className="flex items-start gap-4 p-5">
                  {/* Product image */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                    {primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primaryImage.url} alt={primaryImage.alt} className="h-14 w-14 rounded object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/products/${sub.product?.slug}`} className="font-semibold hover:text-accent">
                          {sub.product?.name || "Product"}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Qty: {sub.quantity}</span>
                          <span>·</span>
                          <span>Every {sub.frequencyDays} days</span>
                          {sub.discountPercent && Number(sub.discountPercent) > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-accent font-medium">{sub.discountPercent}% off</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {sub.status === "active" && (
                        <span>Next order: <strong>{new Date(sub.nextOrderDate).toLocaleDateString()}</strong></span>
                      )}
                      <span>Total orders: {sub.totalOrders}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sub.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => handleAction(sub.id, "pause")}
                        >
                          <Pause className="mr-1 h-3 w-3" /> Pause 30 days
                        </Button>
                      )}
                      {sub.status === "paused" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => handleAction(sub.id, "resume")}
                        >
                          <Play className="mr-1 h-3 w-3" /> Resume
                        </Button>
                      )}
                      {sub.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === sub.id}
                          onClick={() => handleAction(sub.id, "cancel")}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
