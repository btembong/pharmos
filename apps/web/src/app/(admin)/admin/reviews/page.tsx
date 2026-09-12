"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, CheckCircle2, XCircle, Trash2, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface AdminReview {
  id: string;
  reviewerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  productId: string;
  productName: string;
  productSlug: string;
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

export default function ReviewsModerationPage() {
  const { getToken } = useAuth();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/products/admin/reviews?status=${filter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      }
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [getToken, filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleApprove(id: string) {
    setActionLoading(id + "-approve");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/admin/reviews/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Review approved");
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isApproved: true } : r))
        );
      } else {
        toast.error("Failed to approve review");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id + "-reject");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/admin/reviews/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Review hidden");
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isApproved: false } : r))
        );
      } else {
        toast.error("Failed to reject review");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this review?")) return;
    setActionLoading(id + "-delete");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Review deleted");
        setReviews((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => t - 1);
      } else {
        toast.error("Failed to delete review");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Review Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total reviews
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchReviews}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No reviews found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{review.reviewerName}</div>
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/products/${review.productSlug}`}
                        target="_blank"
                        className="text-sm text-accent hover:underline"
                      >
                        {review.productName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Stars rating={review.rating} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {review.title && (
                        <p className="text-sm font-medium text-primary">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {review.body}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={review.isApproved ? "default" : "secondary"}
                        className={
                          review.isApproved
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        }
                      >
                        {review.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!review.isApproved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-green-200 text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(review.id)}
                            disabled={actionLoading === review.id + "-approve"}
                          >
                            {actionLoading === review.id + "-approve" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            <span className="ml-1">Approve</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleReject(review.id)}
                            disabled={actionLoading === review.id + "-reject"}
                          >
                            {actionLoading === review.id + "-reject" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span className="ml-1">Hide</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-destructive/30 text-destructive hover:bg-destructive/5"
                          onClick={() => handleDelete(review.id)}
                          disabled={actionLoading === review.id + "-delete"}
                        >
                          {actionLoading === review.id + "-delete" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
