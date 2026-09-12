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
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  status: string;
  author: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "drug-guides": "Drug Guides",
  "wellness": "Wellness",
  "supplements": "Supplements",
  "drug-interactions": "Drug Interactions",
  "news": "News",
  "how-to": "How-To",
};

export default function BlogAdminPage() {
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/blog/admin/all?status=${statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      }
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/blog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Post deleted");
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setTotal((t) => t - 1);
      } else {
        toast.error("Failed to delete post");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Blog Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} total posts</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/admin/blog/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Articles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No posts yet.</p>
              <Link href="/admin/blog/new" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create your first post
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <p className="max-w-xs font-medium text-sm text-primary line-clamp-1">
                        {post.title}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">/blog/{post.slug}</p>
                    </TableCell>
                    <TableCell>
                      {post.category && (
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {post.author ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          post.status === "published"
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        }
                      >
                        {post.status === "published" ? (
                          <Globe className="mr-1 h-3 w-3" />
                        ) : (
                          <FileText className="mr-1 h-3 w-3" />
                        )}
                        {post.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {post.status === "published" && (
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Button size="sm" variant="outline" className="h-7">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/admin/blog/${post.id}`}>
                          <Button size="sm" variant="outline" className="h-7">
                            <Pencil className="h-3 w-3" />
                            <span className="ml-1">Edit</span>
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-destructive/30 text-destructive hover:bg-destructive/5"
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={deletingId === post.id}
                        >
                          {deletingId === post.id ? (
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
