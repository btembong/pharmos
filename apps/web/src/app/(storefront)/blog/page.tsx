import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { NewsletterSignup } from "@/components/storefront/newsletter-signup";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Health & Pharmacy Blog | PharmaFlow",
  description:
    "Expert articles on medications, supplements, drug interactions, and wellness. Written by licensed pharmacists and health professionals.",
  openGraph: {
    title: "Health & Pharmacy Blog | PharmaFlow",
    description:
      "Expert articles on medications, supplements, drug interactions, and wellness.",
    type: "website",
  },
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  author: string | null;
  authorTitle: string | null;
  category: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  readingTimeMinutes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  "drug-guides": "Drug Guides",
  "wellness": "Wellness",
  "supplements": "Supplements",
  "drug-interactions": "Drug Interactions",
  "news": "News",
  "how-to": "How-To",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page = "1" } = await searchParams;

  let posts: BlogPost[] = [];
  let total = 0;
  let categories: string[] = [];

  try {
    const params = new URLSearchParams({ page, limit: "12" });
    if (category) params.set("category", category);

    const [postsRes, catsRes] = await Promise.all([
      apiClient<{ data: BlogPost[]; meta: { total: number } }>(
        `/api/blog?${params}`
      ),
      apiClient<{ data: string[] }>(`/api/blog/categories`),
    ]);
    posts = postsRes.data ?? [];
    total = postsRes.meta?.total ?? 0;
    categories = catsRes.data ?? [];
  } catch {
    // silent — show empty state
  }

  const featuredPost = posts[0];
  const restPosts = posts.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
          <BookOpen className="h-3.5 w-3.5" />
          Health &amp; Pharmacy Blog
        </div>
        <h1 className="text-3xl font-bold text-primary lg:text-4xl">
          Expert Health Insights
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Articles written by licensed pharmacists and health professionals — covering
          medications, supplements, drug interactions, and wellness.
        </p>
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          <Link
            href="/blog"
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-secondary"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${cat}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-secondary"
              }`}
            >
              {CATEGORY_LABELS[cat!] ?? cat}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/20" />
          <p className="mt-4 text-sm text-muted-foreground">No articles yet. Check back soon!</p>
        </div>
      ) : (
        <>
          {/* Featured post */}
          {featuredPost && !category && (
            <Link href={`/blog/${featuredPost.slug}`} className="group mb-10 block">
              <div className="overflow-hidden rounded-2xl border bg-secondary/10 transition-all hover:shadow-lg">
                <div className="grid lg:grid-cols-2">
                  {featuredPost.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredPost.featuredImage}
                      alt={featuredPost.featuredImageAlt ?? featuredPost.title}
                      className="aspect-video w-full object-cover lg:aspect-auto lg:h-full"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5 lg:aspect-auto lg:h-full">
                      <BookOpen className="h-16 w-16 text-accent/20" strokeWidth={1} />
                    </div>
                  )}
                  <div className="flex flex-col justify-center p-6 lg:p-8">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {featuredPost.category && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {CATEGORY_LABELS[featuredPost.category] ?? featuredPost.category}
                        </Badge>
                      )}
                      <Badge className="bg-accent/10 text-accent text-xs hover:bg-accent/10">
                        Featured
                      </Badge>
                    </div>
                    <h2 className="text-xl font-bold leading-tight text-primary group-hover:text-accent transition-colors lg:text-2xl">
                      {featuredPost.title}
                    </h2>
                    {featuredPost.excerpt && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {featuredPost.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {featuredPost.author}
                          {featuredPost.authorTitle && `, ${featuredPost.authorTitle}`}
                        </span>
                      )}
                      {featuredPost.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(featuredPost.publishedAt)}
                        </span>
                      )}
                      {featuredPost.readingTimeMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {featuredPost.readingTimeMinutes} min read
                        </span>
                      )}
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2.5 transition-all">
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Post grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(category ? posts : restPosts).map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md"
              >
                {post.featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt={post.featuredImageAlt ?? post.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-secondary/60 to-secondary/30">
                    <BookOpen className="h-10 w-10 text-muted-foreground/20" strokeWidth={1} />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  {post.category && (
                    <Badge variant="secondary" className="mb-2 w-fit text-xs capitalize">
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </Badge>
                  )}
                  <h2 className="text-base font-bold leading-snug text-primary group-hover:text-accent transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                    )}
                    {post.readingTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTimeMinutes}m
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {total > 12 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Showing {posts.length} of {total} articles
            </p>
          )}
        </>
      )}

      <Separator className="my-12" />

      {/* Newsletter CTA */}
      <NewsletterSignup source="blog" />
    </div>
  );
}
