"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { BlogEditor } from "@/components/admin/blog-editor";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function EditBlogPostPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPost() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/blog/admin/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPost(data.data);
        } else {
          setError("Post not found");
        }
      } catch {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [id, getToken]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Link
          href="/admin/blog"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Blog
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-primary line-clamp-1">
          {post?.title ?? "Edit Post"}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <BlogEditor
            postId={id}
            initialData={{
              slug: post.slug ?? "",
              title: post.title ?? "",
              excerpt: post.excerpt ?? "",
              body: post.body ?? "",
              featuredImage: post.featuredImage ?? "",
              featuredImageAlt: post.featuredImageAlt ?? "",
              author: post.author ?? "",
              authorTitle: post.authorTitle ?? "",
              category: post.category ?? "",
              tags: post.tags ?? [],
              status: post.status ?? "draft",
              metaTitle: post.metaTitle ?? "",
              metaDescription: post.metaDescription ?? "",
              relatedProductSlugs: post.relatedProductSlugs ?? [],
              readingTimeMinutes: post.readingTimeMinutes ?? "",
            }}
          />
        )}
      </div>
    </div>
  );
}
