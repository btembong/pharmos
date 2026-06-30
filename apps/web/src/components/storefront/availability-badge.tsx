"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader } from "lucide-react";

type AvailabilityStatus = "in_stock" | "low_stock" | "out_of_stock";

interface Availability {
  available: number;
  status: AvailabilityStatus;
}

interface AvailabilityBadgeProps {
  productId: string;
}

const STATUS_UI: Record<AvailabilityStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  in_stock:     { icon: CheckCircle2,  label: "In Stock",     className: "text-accent bg-accent/10 border-accent/20" },
  low_stock:    { icon: AlertTriangle, label: "Low Stock",    className: "text-accent bg-accent/5 border-accent/20" },
  out_of_stock: { icon: XCircle,       label: "Out of Stock", className: "text-muted-foreground bg-secondary/40 border-border/60" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function AvailabilityBadge({ productId }: AvailabilityBadgeProps) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  async function fetchAvailability() {
    try {
      const res = await fetch(`${API_URL}/api/inventory/availability/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.data);
        setFetchFailed(false);
      } else {
        setFetchFailed(true);
      }
    } catch {
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailability();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAvailability, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader className="h-3 w-3 animate-spin" />
        Checking availability…
      </div>
    );
  }

  if (fetchFailed || !availability) {
    return (
      <div className="flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
        Out of Stock
      </div>
    );
  }

  const { icon: Icon, label, className } = STATUS_UI[availability.status];

  return (
    <div className={`flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {availability.status === "low_stock" && availability.available > 0 && (
        <span className="text-muted-foreground">· {availability.available} left</span>
      )}
    </div>
  );
}
