"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Star, ShieldCheck, Quote, Filter, ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

interface ReviewsMeta {
  total: number;
  page: number;
  limit: number;
  avgRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-6 w-6" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<ReviewsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const LIMIT = 20;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (ratingFilter) params.set("rating", String(ratingFilter));
      const res = await fetch(`${API_URL}/api/reviews?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data ?? []);
        setMeta(data.meta ?? null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [ratingFilter]);

  const totalPages = meta ? Math.ceil(meta.total / LIMIT) : 1;
  const avgRating = meta?.avgRating ?? 0;
  const breakdown = meta?.ratingBreakdown ?? {};
  const totalReviews = meta?.totalReviews ?? 0;

  // JSON-LD for Google rich snippets
  const jsonLd = totalReviews > 0 ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PharmaFlow",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": totalReviews,
      "bestRating": 5,
      "worstRating": 1,
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {/* Page header */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            Verified Customer Reviews
          </div>
          <h1 className="text-3xl font-bold text-primary lg:text-4xl">What Our Customers Say</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Real reviews from verified buyers — we publish every approved review, positive or critical.
          </p>
        </div>

        {/* Aggregate rating summary */}
        <div className="mb-10 overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50/60 to-white p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            {/* Big score */}
            <div className="flex flex-col items-center">
              <span className="text-7xl font-extrabold leading-none text-primary">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <Stars rating={Math.round(avgRating)} size="lg" />
              <p className="mt-2 text-sm text-muted-foreground">
                {totalReviews > 0 ? `${totalReviews.toLocaleString()} verified review${totalReviews !== 1 ? "s" : ""}` : "No reviews yet"}
              </p>
            </div>

            {/* Breakdown bars */}
            {totalReviews > 0 && (
              <div className="w-full max-w-sm flex-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const cnt = breakdown[star] ?? 0;
                  const pct = totalReviews > 0 ? (cnt / totalReviews) * 100 : 0;
                  return (
                    <button
                      key={star}
                      onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                      className={`group mb-1.5 flex w-full items-center gap-3 rounded-lg px-2 py-1 transition-colors ${ratingFilter === star ? "bg-amber-100" : "hover:bg-amber-50"}`}
                    >
                      <span className="w-3 text-right text-xs font-medium text-muted-foreground">{star}</span>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-muted-foreground">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex flex-col gap-2.5 sm:ml-auto sm:items-end">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                <ShieldCheck className="h-4 w-4" />
                All reviews are verified
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                Moderated for authenticity
              </div>
              <Link href="/products">
                <Button size="sm" className="mt-1 gap-1.5" variant="outline">
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Write a Review
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
          <button
            onClick={() => setRatingFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!ratingFilter ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}
          >
            All Stars
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${ratingFilter === star ? "bg-amber-400 text-white border-amber-400" : "hover:bg-secondary"}`}
            >
              {star} <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
          {ratingFilter && (
            <span className="ml-2 text-xs text-muted-foreground">
              Showing {meta?.total ?? 0} reviews
            </span>
          )}
        </div>

        {/* Reviews grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted/20" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center">
            <Star className="mx-auto h-12 w-12 text-muted-foreground/20" />
            <p className="mt-4 text-sm text-muted-foreground">No reviews match this filter.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setRatingFilter(null)}>
              Clear filter
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-accent/0 transition-all group-hover:bg-accent" />
                  <Quote className="h-6 w-6 text-accent/10" />
                  <div className="mt-2">
                    <Stars rating={review.rating} />
                  </div>
                  {review.title && (
                    <h3 className="mt-2 text-sm font-semibold text-primary line-clamp-1">{review.title}</h3>
                  )}
                  {review.body && (
                    <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-xs font-semibold text-primary">{review.reviewerName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        on{" "}
                        <Link href={`/products/${review.productSlug}`} className="text-accent hover:underline">
                          {review.productName}
                        </Link>
                      </p>
                    </div>
                    {review.isVerifiedPurchase && (
                      <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-[10px] text-green-700">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border bg-gradient-to-br from-accent/5 to-accent/10 p-8 text-center">
          <h2 className="text-xl font-bold text-primary">Bought from us? Share your experience.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your honest review helps other researchers make informed decisions.
          </p>
          <Link href="/products">
            <Button className="mt-5 gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Browse Products &amp; Leave a Review
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
