import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, ArrowLeft, ArrowRight, ChevronRight, Microscope, ShieldCheck, Award } from "lucide-react";
import { ProductFilters } from "@/components/storefront/product-filters";
import { QuickAddButton } from "@/components/storefront/quick-add-button";
import { StockBadge } from "@/components/storefront/stock-badge";
import { ProductRating } from "@/components/storefront/product-rating";
import { CompareCheckbox } from "@/components/storefront/compare-checkbox";
import { Suspense } from "react";

export const revalidate = 300;

interface Product {
  id: string;
  name: string;
  slug: string;
  genericName: string | null;
  strength: string | null;
  packSize: string | null;
  dosageForm: string | null;
  manufacturer: string | null;
  requiresPrescription: boolean;
  isFeatured?: boolean;
  isResearchCompound?: boolean;
  isControlledSubstance?: boolean;
  casNumber?: string | null;
  purityPercent?: number | null;
  vialSizeMg?: string | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category?: { id: string; name: string; slug: string } | null;
  prices?: { amount: number; priceType: string }[] | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductListResponse {
  data: Product[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export default async function ProductsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await searchParamsPromise;
  let products: Product[] = [];
  let categories: Category[] = [];
  let meta = { total: 0, page: 1, limit: 24, pages: 0 };

  const currentPage = Number(searchParams.page) || 1;

  await Promise.allSettled([
    (async () => {
      const params = new URLSearchParams();
      if (searchParams.search) params.set("search", String(searchParams.search));
      if (searchParams.categorySlug) params.set("categorySlug", String(searchParams.categorySlug));
      if (searchParams.sortBy) params.set("sortBy", String(searchParams.sortBy));
      if (searchParams.page) params.set("page", String(searchParams.page));
      params.set("limit", "24");
      const result = await apiClient<ProductListResponse>(`/api/products?${params.toString()}`);
      products = result.data;
      meta = result.meta;
    })(),
    (async () => {
      const result = await apiClient<{ data: Category[] }>("/api/products/categories");
      categories = result.data ?? [];
    })(),
  ]);

  const activeCategory = categories.find((c) => c.slug === String(searchParams.categorySlug ?? ""));

  function pageHref(page: number) {
    const p = new URLSearchParams();
    if (searchParams.search) p.set("search", String(searchParams.search));
    if (searchParams.categorySlug) p.set("categorySlug", String(searchParams.categorySlug));
    if (searchParams.sortBy) p.set("sortBy", String(searchParams.sortBy));
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  const pageTitle = searchParams.search
    ? `Results for "${searchParams.search}"`
    : activeCategory?.name ?? "All Products";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">

      {/* ── Page header ── */}
      <div className="mb-6 border-b pb-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>
          {meta.total > 0 && (
            <span className="text-sm text-muted-foreground">
              {meta.total} product{meta.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {/* Active filter chip */}
        {activeCategory && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtering by:</span>
            <Link
              href="/products"
              className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent hover:bg-accent/20"
            >
              {activeCategory.name}
              <span className="ml-0.5 text-accent/60">×</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Two-column layout: sidebar + content ── */}
      <div className="flex gap-8">

        {/* ── Left sidebar (desktop only) ── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <Suspense>
            <ProductFilters categories={categories} layout="sidebar" />
          </Suspense>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1">

          {/* Mobile filters (horizontal pills) */}
          <div className="lg:hidden">
            <Suspense>
              <ProductFilters categories={categories} layout="horizontal" />
            </Suspense>
          </div>

          {/* Sort bar (desktop) — rendered inside ProductFilters at sidebar */}
          <div className="hidden items-center justify-between border-b pb-3 lg:flex">
            <span className="text-sm text-muted-foreground">
              {meta.total} product{meta.total !== 1 ? "s" : ""}
            </span>
            <Suspense>
              <ProductFilters categories={categories} layout="sort-only" />
            </Suspense>
          </div>

          {/* ── Empty state ── */}
          {products.length === 0 ? (
            <div className="mt-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/40">
                <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchParams.search
                  ? `No results for "${searchParams.search}"`
                  : "Try a different category or search term"}
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                View all products
              </Link>
            </div>
          ) : (
            <>
              {/* ── Product grid ── */}
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 lg:mt-6">
                {products.map((product) => {
                  const imageUrl =
                    product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
                  const imageAlt = product.images?.[0]?.alt ?? product.name;
                  const specs = [product.strength, product.dosageForm, product.packSize]
                    .filter(Boolean) as string[];

                  return (
                    <Link key={product.id} href={`/products/${product.slug}`} className="group">
                      <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">

                        {/* Image */}
                        <div className="relative overflow-hidden bg-secondary/30">
                          {/* Aspect ratio 4:5 — taller, catalog-style */}
                          <div className="aspect-[4/5]">
                            {imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt={imageAlt}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                {product.isResearchCompound ? (
                                  <Microscope className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
                                ) : (
                                  <FlaskConical className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 flex items-end justify-center bg-primary/0 transition-all duration-300 group-hover:bg-primary/50">
                            <div className="mb-5 flex translate-y-3 items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-semibold text-primary opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                              View Details
                              <ChevronRight className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {/* Badges overlaid */}
                          <div className="absolute left-2 top-2 flex flex-col gap-1">
                            {product.isFeatured && (
                              <Badge className="bg-amber-500 text-[10px] text-white shadow-sm gap-0.5">
                                <Award className="h-2.5 w-2.5" /> Staff Pick
                              </Badge>
                            )}
                            {product.requiresPrescription && (
                              <Badge variant="destructive" className="text-[10px] shadow-sm">Rx</Badge>
                            )}
                            {product.isResearchCompound && (
                              <Badge className="bg-accent/90 text-[10px] text-white shadow-sm">
                                Research
                              </Badge>
                            )}
                            {product.isControlledSubstance && (
                              <Badge variant="destructive" className="text-[10px] shadow-sm">CIII</Badge>
                            )}
                          </div>

                          {/* Purity badge for peptides */}
                          {product.isResearchCompound && product.purityPercent !== null && product.purityPercent !== undefined && (
                            <div className="absolute right-2 top-2">
                              <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                ≥{product.purityPercent}%
                              </span>
                            </div>
                          )}

                          {/* Low stock / out of stock badge */}
                          <div className="absolute bottom-2 left-2">
                            <StockBadge productId={product.id} />
                          </div>

                          {/* Compare checkbox */}
                          <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <CompareCheckbox product={{
                              id: product.id,
                              name: product.name,
                              slug: product.slug,
                              price: (() => { const p = product.prices?.find((p) => p.priceType === "b2c"); return p ? Number(p.amount) : 0; })(),
                              image: product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? null,
                              strength: product.strength,
                              dosageForm: product.dosageForm,
                              packSize: product.packSize,
                              manufacturer: product.manufacturer,
                              genericName: product.genericName,
                            }} />
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="flex flex-1 flex-col gap-1.5 p-3">
                          {/* Category */}
                          {product.category && (
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent/70">
                              {product.category.name}
                            </span>
                          )}

                          {/* Product name */}
                          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
                            {product.name}
                          </h3>

                          {/* Star rating */}
                          <ProductRating productId={product.id} />

                          {/* Generic name */}
                          {product.genericName && (
                            <p className="line-clamp-1 text-xs italic text-muted-foreground">
                              {product.genericName}
                            </p>
                          )}

                          {/* Spec chips */}
                          {specs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {specs.map((s) => (
                                <span
                                  key={s}
                                  className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Vial size for peptides */}
                          {product.isResearchCompound && product.vialSizeMg && (
                            <span className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground w-fit">
                              {product.vialSizeMg}
                            </span>
                          )}

                          {/* Manufacturer */}
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 shrink-0 text-accent/50" />
                            <span className="line-clamp-1 text-[11px] text-muted-foreground/70">
                              {product.manufacturer ?? "Licensed US Supplier"}
                            </span>
                          </div>

                          {/* Price + Quick Add */}
                          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
                            {(() => {
                              const price = product.prices?.find((p) => p.priceType === "b2c");
                              return price ? (
                                <span className="shrink-0 text-sm font-bold text-accent">
                                  ${Number(price.amount).toFixed(2)}
                                </span>
                              ) : null;
                            })()}
                            {!product.requiresPrescription && (() => {
                              const price = product.prices?.find((p) => p.priceType === "b2c");
                              const img = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? null;
                              return (
                                <QuickAddButton
                                  productId={product.id}
                                  name={product.name}
                                  slug={product.slug}
                                  price={price ? Number(price.amount) : 0}
                                  image={img}
                                  strength={product.strength}
                                  dosageForm={product.dosageForm}
                                  packSize={product.packSize}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* ── Pagination ── */}
              {meta.pages > 1 && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-12">
                  {currentPage > 1 ? (
                    <Link
                      href={pageHref(currentPage - 1)}
                      className="flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Previous
                    </Link>
                  ) : (
                    <span className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border bg-muted/20 px-4 py-2 text-sm text-muted-foreground/40">
                      <ArrowLeft className="h-3.5 w-3.5" /> Previous
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.pages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === meta.pages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | "…")[]>((acc, p, i, arr) => {
                        if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) {
                          acc.push("…");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === "…" ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">…</span>
                        ) : (
                          <Link
                            key={item}
                            href={pageHref(item as number)}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                              item === currentPage
                                ? "bg-primary text-primary-foreground"
                                : "border hover:bg-muted"
                            }`}
                          >
                            {item}
                          </Link>
                        )
                      )}
                  </div>

                  {currentPage < meta.pages ? (
                    <Link
                      href={pageHref(currentPage + 1)}
                      className="flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Next <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border bg-muted/20 px-4 py-2 text-sm text-muted-foreground/40">
                      Next <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              )}

              {meta.pages > 1 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Page {currentPage} of {meta.pages} · {meta.total} products
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
