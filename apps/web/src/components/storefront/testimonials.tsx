"use client";

import { useState, useEffect } from "react";
import { Star, Quote, ShieldCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  productName: string;
  productSlug: string;
}

const FALLBACK_REVIEWS: Review[] = [
  {
    id: "f1",
    reviewerName: "Dr. M. Chen",
    rating: 5,
    title: "Excellent purity",
    body: "COA verified, HPLC results matched claims. Will reorder.",
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
    productName: "BPC-157",
    productSlug: "bpc-157",
  },
  {
    id: "f2",
    reviewerName: "Sarah K.",
    rating: 5,
    title: "Fast shipping",
    body: "Ordered Monday, received Wednesday. Great packaging and included COA.",
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
    productName: "TB-500",
    productSlug: "tb-500",
  },
  {
    id: "f3",
    reviewerName: "James R.",
    rating: 5,
    title: "Reliable supplier",
    body: "Third order from Pharmos. Consistent quality every time. Highly recommended.",
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
    productName: "Ipamorelin",
    productSlug: "ipamorelin",
  },
];

function AggregateRating({ reviews }: { reviews: Review[] }) {
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;
  const counts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );
  const total = reviews.length;

  return (
    <div className="mx-auto mb-6 flex max-w-md flex-row items-center gap-5 sm:mb-10 sm:gap-8">
      {/* Big number */}
      <div className="text-center">
        <p className="text-3xl font-extrabold text-primary sm:text-5xl">{avg.toFixed(1)}</p>
        <div className="mt-1 flex justify-center gap-0.5 sm:mt-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 sm:h-4 sm:w-4 ${
                i < Math.round(avg)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/20"
              }`}
            />
          ))}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
          {total} review{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Star bars */}
      <div className="flex flex-1 flex-col gap-1 sm:gap-1.5">
        {[5, 4, 3, 2, 1].map((star, idx) => {
          const pct = total > 0 ? (counts[idx] / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-3 text-right text-[10px] font-medium text-muted-foreground sm:text-xs">
                {star}
              </span>
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 sm:h-3 sm:w-3" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50 sm:h-2">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-4 text-right text-[9px] text-muted-foreground sm:w-5 sm:text-[10px]">
                {counts[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>(FALLBACK_REVIEWS);

  useEffect(() => {
    fetch(`${API_URL}/api/products/top-reviews?limit=6&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setReviews(d.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Aggregate Rating */}
      <AggregateRating reviews={reviews} />

      {/* Review Cards */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {reviews.slice(0, 6).map((review) => (
          <div
            key={review.id}
            className="group relative overflow-hidden rounded-xl border border-transparent bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-lg sm:p-6"
          >
            {/* Accent left border on hover */}
            <div className="absolute inset-y-0 left-0 w-1 bg-accent/0 transition-all duration-300 group-hover:bg-accent" />

            {/* Decorative quote */}
            <Quote className="h-6 w-6 text-accent/10 sm:h-8 sm:w-8" />

            {/* Stars */}
            <div className="mt-1.5 flex gap-0.5 sm:mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            {/* Title & Body */}
            {review.title && (
              <h4 className="mt-2 text-xs font-bold text-[#010128] sm:mt-3 sm:text-sm">
                {review.title}
              </h4>
            )}
            {review.body && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-sm">
                &ldquo;{review.body}&rdquo;
              </p>
            )}

            {/* Reviewer */}
            <div className="mt-3 flex items-center justify-between border-t pt-3 sm:mt-5 sm:pt-4">
              <div>
                <p className="text-xs font-semibold text-[#010128] sm:text-sm">
                  {review.reviewerName}
                </p>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  on{" "}
                  <a
                    href={`/products/${review.productSlug}`}
                    className="text-[#7371FC] hover:underline"
                  >
                    {review.productName}
                  </a>
                </p>
              </div>
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-1 rounded-full bg-accent/8 px-2.5 py-1 text-[10px] font-semibold text-accent">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
