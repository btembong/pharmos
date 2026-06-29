"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RatingData {
  avgRating: number;
  totalReviews: number;
}

// In-memory cache shared across all instances
const ratingCache: Record<string, RatingData> = {};

export function ProductRating({ productId, size = "sm" }: { productId: string; size?: "sm" | "md" }) {
  const [data, setData] = useState<RatingData | null>(ratingCache[productId] ?? null);

  useEffect(() => {
    if (ratingCache[productId]) {
      setData(ratingCache[productId]);
      return;
    }
    fetch(`${API_URL}/api/products/${productId}/reviews`)
      .then((r) => r.json())
      .then((res) => {
        const info: RatingData = {
          avgRating: res.meta?.avgRating ?? 0,
          totalReviews: res.meta?.totalReviews ?? 0,
        };
        ratingCache[productId] = info;
        setData(info);
      })
      .catch(() => {});
  }, [productId]);

  if (!data || data.totalReviews === 0) return null;

  const starSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= Math.round(data.avgRating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <span className={`${textSize} text-muted-foreground`}>
        ({data.totalReviews})
      </span>
    </div>
  );
}
