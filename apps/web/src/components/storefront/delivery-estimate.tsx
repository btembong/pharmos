"use client";

import { useState, useEffect, useRef } from "react";
import { Truck, Zap, MapPin, Loader, ChevronRight, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShippingOption {
  earliest: string;
  latest: string;
  fee: number;
  freeAbove?: number | null;
  available?: boolean;
}

interface PickupOption {
  readyInHours: number;
  fee: number;
}

interface DeliveryEstimate {
  standard: ShippingOption;
  express?: ShippingOption;
  pickup?: PickupOption;
  cutoffMessage?: string;
}

interface DeliveryEstimateWidgetProps {
  /** Cart subtotal — used to determine if free shipping threshold is met */
  subtotal?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const ZIP_KEY = "pharmos_zip";

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function dateRange(earliest: string, latest: string): string {
  if (earliest === latest) return formatDate(earliest);
  return `${formatDate(earliest)} – ${formatDate(latest)}`;
}

export function DeliveryEstimateWidget({ subtotal = 0 }: DeliveryEstimateWidgetProps) {
  const [zip, setZip] = useState("");
  const [committed, setCommitted] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore saved ZIP on mount and auto-fetch
  useEffect(() => {
    const saved = localStorage.getItem(ZIP_KEY);
    if (saved) {
      setZip(saved);
      fetchEstimate(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEstimate(zipCode: string) {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    setEstimate(null);

    try {
      const res = await fetch(
        `${API_URL}/api/delivery/estimate?zipCode=${encodeURIComponent(zipCode)}`
      );

      if (!res.ok) {
        setError("Could not load delivery info.");
        return;
      }

      const data = await res.json();

      if (data.data?.available === false) {
        setUnavailable(true);
        return;
      }

      setEstimate(data.data);
      setCommitted(zipCode);
      localStorage.setItem(ZIP_KEY, zipCode);
    } catch {
      setError("Could not reach delivery service.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
      setError("Enter a valid 5-digit US ZIP code.");
      return;
    }
    fetchEstimate(trimmed);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
    setError(null);
  }

  function handleEditZip() {
    setEstimate(null);
    setCommitted(null);
    setUnavailable(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const isFreeStandard =
    estimate?.standard.freeAbove != null && subtotal >= estimate.standard.freeAbove;

  return (
    <div className="rounded-xl border bg-secondary/20 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-primary">Delivery Estimate</span>
      </div>

      {/* ZIP input */}
      {!estimate && !unavailable ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="Enter ZIP code"
              value={zip}
              onChange={handleChange}
              maxLength={5}
              className="w-full rounded-lg border bg-white py-2 pl-8 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={loading || zip.length < 5}
            className="shrink-0 bg-accent text-white hover:bg-accent/90"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>Check <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></>
            )}
          </Button>
        </form>
      ) : (
        /* ZIP tag — shown after a result loads */
        <button
          onClick={handleEditZip}
          className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent"
        >
          <MapPin className="h-3 w-3" />
          <span>ZIP {committed}</span>
          <span className="text-accent underline">Change</span>
        </button>
      )}

      {/* Validation / network error */}
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}

      {/* Unavailable */}
      {unavailable && (
        <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
          Delivery is not available to ZIP {zip}. Please contact us for shipping options.
        </div>
      )}

      {/* Estimate results */}
      {estimate && (
        <div className="mt-1 space-y-2">

          {/* Standard */}
          <div className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-accent/60" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Standard Shipping</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Arrives {dateRange(estimate.standard.earliest, estimate.standard.latest)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {isFreeStandard ? (
                <span className="text-xs font-bold text-green-600">Free</span>
              ) : estimate.standard.fee === 0 ? (
                <span className="text-xs font-bold text-green-600">Free</span>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  ${estimate.standard.fee.toFixed(2)}
                </span>
              )}
              {estimate.standard.freeAbove != null && !isFreeStandard && (
                <p className="text-[10px] text-muted-foreground">
                  Free over ${estimate.standard.freeAbove}
                </p>
              )}
            </div>
          </div>

          {/* Express */}
          {estimate.express?.available !== false && estimate.express && (
            <div className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Express Shipping</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Arrives {dateRange(estimate.express.earliest, estimate.express.latest)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-foreground">
                ${estimate.express.fee.toFixed(2)}
              </span>
            </div>
          )}

          {/* Cutoff message */}
          {estimate.cutoffMessage && (
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0 text-accent/60" />
              {estimate.cutoffMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
