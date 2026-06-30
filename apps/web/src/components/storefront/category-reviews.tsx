"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  productName?: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function CategoryReviews({ categorySlug }: { categorySlug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        // Fetch products in this category
        const prodRes = await fetch(
          `${API_URL}/api/products?categorySlug=${categorySlug}&limit=20`
        );
        if (!prodRes.ok) return;
        const prodData = await prodRes.json();
        const products: Product[] = prodData.data ?? [];

        // Fetch reviews for each product (first 3 products max to limit requests)
        const allReviews: Review[] = [];
        for (const product of products.slice(0, 5)) {
          try {
            const revRes = await fetch(
              `${API_URL}/api/products/${product.slug}/reviews`
            );
            if (revRes.ok) {
              const revData = await revRes.json();
              const revs: Review[] = (revData.data ?? []).map((r: Review) => ({
                ...r,
                productName: product.name,
              }));
              allReviews.push(...revs);
            }
          } catch {
            // skip
          }
        }

        // Sort by date and take top 6
        allReviews.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReviews(allReviews.slice(0, 6));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No reviews yet for this category. Be the first to leave a review!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <Card key={review.id} className="h-full">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <Stars rating={review.rating} />
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
            {review.title && (
              <p className="mt-2 text-sm font-semibold text-[#010128]">{review.title}</p>
            )}
            {review.body && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {review.body}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{review.reviewerName}</span>
              {review.productName && (
                <span className="max-w-[120px] truncate text-[10px]">
                  on {review.productName}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
