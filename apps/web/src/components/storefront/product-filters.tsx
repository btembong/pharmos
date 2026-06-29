"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { FlaskConical, Pill, HeartPulse, Leaf, Package, BriefcaseMedical, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: Category[];
  layout?: "sidebar" | "horizontal" | "sort-only";
}

const SORT_OPTIONS = [
  { label: "Featured",          value: "" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z",          value: "name" },
  { label: "Newest",            value: "newest" },
];

// Icon mapping for well-known category slugs
const CATEGORY_ICONS: Record<string, typeof FlaskConical> = {
  peptides:       FlaskConical,
  otc:            Pill,
  vitamins:       Leaf,
  supplements:    Leaf,
  "personal-care": HeartPulse,
  "first-aid":    BriefcaseMedical,
};

export function ProductFilters({ categories, layout = "horizontal" }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSlug = searchParams.get("categorySlug") ?? "";
  const currentSort = searchParams.get("sortBy") ?? "";

  const buildHref = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      const qs = params.toString();
      return `/products${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  function handleSort(value: string) {
    router.push(buildHref({ sortBy: value }));
  }

  const allCategories = [{ id: "", name: "All Products", slug: "" }, ...categories];

  // ── Sort-only mode (used in desktop top bar) ────────────────────────────────
  if (layout === "sort-only") {
    return (
      <select
        value={currentSort}
        onChange={(e) => handleSort(e.target.value)}
        className="rounded-lg border bg-transparent px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 w-40"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  // ── Horizontal pills mode (mobile) ─────────────────────────────────────────
  if (layout === "horizontal") {
    return (
      <div className="mb-4 space-y-3">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allCategories.map((cat) => {
            const active = currentSlug === cat.slug;
            return (
              <a
                key={cat.slug}
                href={buildHref({ categorySlug: cat.slug })}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {cat.name}
              </a>
            );
          })}
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            className="rounded-lg border bg-transparent px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring w-36"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // ── Sidebar mode (desktop) ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Categories
        </p>
        <ul className="space-y-0.5">
          {allCategories.map((cat) => {
            const active = currentSlug === cat.slug;
            const Icon = CATEGORY_ICONS[cat.slug] ?? Package;
            return (
              <li key={cat.slug}>
                <a
                  href={buildHref({ categorySlug: cat.slug })}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted-foreground/60"}`}
                    strokeWidth={active ? 2 : 1.5}
                  />
                  <span className="flex-1">{cat.name}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-accent/60" />}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sort */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sort By
        </p>
        <ul className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => {
            const active = currentSort === opt.value;
            return (
              <li key={opt.value}>
                <button
                  onClick={() => handleSort(opt.value)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Divider + CTA */}
      <div className="rounded-xl border bg-accent/5 p-4 text-center">
        <FlaskConical className="mx-auto mb-2 h-6 w-6 text-accent/60" strokeWidth={1.5} />
        <p className="text-xs font-medium text-primary">COA with every order</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">HPLC tested. US supplier.</p>
      </div>
    </div>
  );
}
