import { apiClient } from "@/lib/api-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { NewsletterSignup } from "@/components/storefront/newsletter-signup";

export const revalidate = 300;

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  author: string | null;
  authorTitle: string | null;
  category: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  readingTimeMinutes: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  relatedProductSlugs: string[] | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  images: { url: string; isPrimary: boolean }[] | null;
  prices: { amount: string; priceType: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "drug-guides": "Drug Guides",
  "wellness": "Wellness",
  "supplements": "Supplements",
  "drug-interactions": "Drug Interactions",
  "news": "News",
  "how-to": "How-To",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: post } = await apiClient<{ data: BlogPost }>(`/api/blog/${slug}`);
    return {
      title: post.metaTitle ?? `${post.title} | PharmaFlow Blog`,
      description:
        post.metaDescription ?? post.excerpt ?? `Read ${post.title} on PharmaFlow Blog.`,
      openGraph: {
        title: post.metaTitle ?? post.title,
        description: post.metaDescription ?? post.excerpt ?? "",
        type: "article",
        publishedTime: post.publishedAt ?? undefined,
        authors: post.author ? [post.author] : undefined,
        images: post.featuredImage ? [{ url: post.featuredImage }] : [],
      },
    };
  } catch {
    return { title: "Blog | PharmaFlow" };
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Render body — simple markdown-ish: headings, bold, paragraphs
function BodyRenderer({ body }: { body: string }) {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="mb-4 ml-5 space-y-1 list-disc text-sm leading-relaxed text-muted-foreground">
          {listBuffer.map((item, i) => (
            <li key={i}>{item.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={i} className="mb-3 mt-8 text-xl font-bold text-primary first:mt-0">
          {trimmed.slice(2)}
        </h2>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={i} className="mb-2 mt-6 text-lg font-semibold text-primary">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="mb-1.5 mt-4 text-base font-semibold text-primary">
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed);
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      // Bold inline: **text**
      const rendered = trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      elements.push(
        <p
          key={i}
          className="mb-4 text-sm leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }
  });

  flushList();
  return <div>{elements}</div>;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post: BlogPost | null = null;
  let relatedProducts: RelatedProduct[] = [];

  try {
    const { data } = await apiClient<{ data: BlogPost }>(`/api/blog/${slug}`);
    post = data;
  } catch {
    notFound();
  }

  if (!post) notFound();

  // Fetch related products if any
  if (post.relatedProductSlugs && post.relatedProductSlugs.length > 0) {
    try {
      const productResults = await Promise.allSettled(
        post.relatedProductSlugs.slice(0, 4).map((s) =>
          apiClient<{ data: RelatedProduct }>(`/api/products/${s}`)
        )
      );
      relatedProducts = productResults
        .filter((r): r is PromiseFulfilledResult<{ data: RelatedProduct }> => r.status === "fulfilled")
        .map((r) => r.value.data);
    } catch {
      // silent
    }
  }

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt ?? "",
    image: post.featuredImage ?? undefined,
    author: post.author
      ? {
          "@type": "Person",
          name: post.author,
          jobTitle: post.authorTitle ?? undefined,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "PharmaFlow",
      logo: { "@type": "ImageObject", url: "/Logo.png" },
    },
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    mainEntityOfPage: { "@type": "WebPage" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/blog" className="transition-colors hover:text-foreground">Blog</Link>
          {post.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/blog?category=${post.category}`}
                className="transition-colors hover:text-foreground"
              >
                {CATEGORY_LABELS[post.category] ?? post.category}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-foreground">{post.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main content */}
          <div>
            {/* Featured image */}
            {post.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.featuredImage}
                alt={post.featuredImageAlt ?? post.title}
                className="mb-6 w-full rounded-2xl object-cover"
                style={{ maxHeight: 420 }}
              />
            )}

            {/* Category */}
            {post.category && (
              <Badge variant="secondary" className="mb-3 text-xs capitalize">
                {CATEGORY_LABELS[post.category] ?? post.category}
              </Badge>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-primary lg:text-3xl">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {post.author && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <User className="h-3.5 w-3.5" />
                  {post.author}
                  {post.authorTitle && (
                    <span className="font-normal text-muted-foreground">, {post.authorTitle}</span>
                  )}
                </span>
              )}
              {post.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              {post.readingTimeMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readingTimeMinutes} min read
                </span>
              )}
            </div>

            {/* Pharmacist review badge */}
            {post.author && post.authorTitle && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-accent" />
                <span>
                  <strong className="text-foreground">Reviewed by {post.author}</strong>
                  {" — "}{post.authorTitle}
                </span>
              </div>
            )}

            <Separator className="my-6" />

            {/* Article body */}
            {post.body ? (
              <article className="prose-pharma">
                <BodyRenderer body={post.body} />
              </article>
            ) : post.excerpt ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
            ) : null}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator className="my-8" />

            {/* Back to blog */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Related products */}
            {relatedProducts.length > 0 && (
              <div className="rounded-2xl border p-5">
                <h3 className="mb-4 text-sm font-bold text-primary">Products Mentioned</h3>
                <div className="space-y-3">
                  {relatedProducts.map((product) => {
                    const img = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
                    const price = product.prices?.find((p) => p.priceType === "b2c");
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-accent/30 hover:shadow-sm"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary/30">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-primary">{product.name}</p>
                          {price && (
                            <p className="text-xs font-bold text-accent">${Number(price.amount).toFixed(2)}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Newsletter sidebar widget */}
            <div className="rounded-2xl border bg-secondary/10 p-5">
              <BookOpen className="mb-3 h-6 w-6 text-accent" />
              <h3 className="text-sm font-bold text-primary">Get health tips in your inbox</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Weekly articles from our pharmacists. No spam, ever.
              </p>
              <NewsletterSignup source="blog-sidebar" compact />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
