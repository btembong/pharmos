"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, CheckCircle2, MessageSquarePlus, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ReviewImage {
  url: string;
  alt: string;
}

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: ReviewImage[] | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewMeta {
  avgRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 ${
              i <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewPhotos({ images }: { images: ReviewImage[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <div className="mt-3 flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightbox(img.url)}
            className="h-16 w-16 overflow-hidden rounded-lg border transition-all hover:ring-2 hover:ring-accent/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Review photo"
            className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function ProductReviews({ productSlug }: { productSlug: string }) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<ReviewMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: "", body: "", reviewerName: "" });
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && !form.reviewerName) {
      setForm((f) => ({ ...f, reviewerName: user.fullName || user.firstName || "" }));
    }
  }, [user, form.reviewerName]);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API_URL}/api/products/${productSlug}/reviews`);
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
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (reviewImages.length >= 5) {
      toast.error("Maximum 5 photos per review");
      return;
    }
    setUploadingImage(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API_URL}/api/uploads/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (data.data?.url) {
        setReviewImages((prev) => [...prev, { url: data.data.url, alt: "Review photo" }]);
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!form.reviewerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/${productSlug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rating: form.rating,
          title: form.title || undefined,
          body: form.body || undefined,
          reviewerName: form.reviewerName,
          images: reviewImages.length > 0 ? reviewImages : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Review submitted! It will appear after moderation.");
        setShowForm(false);
        setForm({ rating: 0, title: "", body: "", reviewerName: user?.fullName || "" });
        setReviewImages([]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to submit review");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-10 space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">Customer Reviews</h2>
        {isSignedIn && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <MessageSquarePlus className="mr-1.5 h-4 w-4" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Summary stats */}
      {meta && meta.totalReviews > 0 && (
        <div className="mt-4 flex flex-col gap-5 rounded-xl border bg-secondary/20 p-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{meta.avgRating}</p>
            <Stars rating={Math.round(meta.avgRating)} size="md" />
            <p className="mt-1 text-xs text-muted-foreground">{meta.totalReviews} review{meta.totalReviews !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = meta.ratingBreakdown[star] ?? 0;
              const pct = meta.totalReviews > 0 ? (count / meta.totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-right text-xs text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <h3 className="mb-4 font-semibold text-primary">Write Your Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Rating *</label>
                <StarInput value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Your Name *</label>
                <Input
                  value={form.reviewerName}
                  onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
                  placeholder="John D."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Great product!"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Review</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={3}
                  placeholder="Share your experience..."
                  className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              {/* Photo upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Photos (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {reviewImages.map((img, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 5 && (
                    <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-accent hover:text-accent">
                      {uploadingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-5 w-5" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Up to 5 photos. JPG, PNG, or WebP.</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setReviewImages([]); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Stars rating={review.rating} />
                    {review.title && (
                      <p className="mt-1.5 text-sm font-semibold text-primary">{review.title}</p>
                    )}
                  </div>
                  {review.isVerifiedPurchase && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                {review.body && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
                )}
                {review.images && review.images.length > 0 && (
                  <ReviewPhotos images={review.images} />
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{review.reviewerName}</span>
                  <span>&middot;</span>
                  <span>
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="mt-4 rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            {isSignedIn && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
                Write a Review
              </Button>
            )}
          </div>
        )
      )}
    </section>
  );
}
