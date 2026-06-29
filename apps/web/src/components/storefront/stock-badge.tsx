"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface StockInfo {
  available: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

// Shared cache so multiple badges on one page don't re-fetch
let stockCache: Record<string, StockInfo> = {};
let fetchPromise: Promise<void> | null = null;
let pendingIds: string[] = [];

function scheduleBulkFetch() {
  if (fetchPromise) return;
  fetchPromise = new Promise<void>((resolve) => {
    setTimeout(async () => {
      const ids = [...new Set(pendingIds)];
      pendingIds = [];
      fetchPromise = null;
      if (ids.length === 0) { resolve(); return; }
      try {
        const res = await fetch(`${API_URL}/api/inventory/availability/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: ids }),
        });
        if (res.ok) {
          const { data } = await res.json();
          Object.assign(stockCache, data);
        }
      } catch {}
      resolve();
    }, 100); // batch requests within 100ms
  });
}

export function useStockStatus(productId: string): StockInfo | null {
  const [info, setInfo] = useState<StockInfo | null>(stockCache[productId] ?? null);

  useEffect(() => {
    if (stockCache[productId]) {
      setInfo(stockCache[productId]);
      return;
    }
    pendingIds.push(productId);
    scheduleBulkFetch();
    const interval = setInterval(() => {
      if (stockCache[productId]) {
        setInfo(stockCache[productId]);
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [productId]);

  return info;
}

export function StockBadge({ productId }: { productId: string }) {
  const stock = useStockStatus(productId);

  if (!stock) return null;

  if (stock.status === "out_of_stock") {
    return (
      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
        Out of Stock
      </span>
    );
  }

  if (stock.status === "low_stock") {
    return (
      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
        Only {stock.available} left!
      </span>
    );
  }

  return null; // in_stock = no badge needed
}
