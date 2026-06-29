"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award, FlaskConical, Pill, Leaf, Heart, Stethoscope, ShieldCheck,
} from "lucide-react";
import { QuickAddButton } from "./quick-add-button";
import { StockBadge } from "./stock-badge";
import { ProductRating } from "./product-rating";
import { CompareCheckbox } from "./compare-checkbox";

const ICON_MAP: Record<string, typeof FlaskConical> = {
  FlaskConical, Pill, Leaf, Heart, Stethoscope, ShieldCheck,
};

interface Product {
  id: string;
  name: string;
  slug: string;
  manufacturer: string | null;
  purityPercent: number | null;
  isFeatured?: boolean;
  isResearchCompound: boolean;
  requiresPrescription?: boolean;
  shortDescription: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  tags?: string[] | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category: { name: string; slug: string } | null;
  prices: { amount: string; priceType: string }[];
}

interface CategoryProductGridProps {
  products: Product[];
  useCaseFilters?: string[];
  iconName: string;
}

export function CategoryProductGrid({ products, useCaseFilters, iconName }: CategoryProductGridProps) {
  const HeroIcon = ICON_MAP[iconName] || FlaskConical;
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Sort featured to top
  const sorted = [...products].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  // Filter by use case
  const filtered = activeFilter
    ? sorted.filter((p) => {
        const searchable = [p.name, p.dosageForm, p.shortDescription, p.strength, ...(p.tags ?? [])].join(" ").toLowerCase();
        return searchable.includes(activeFilter.toLowerCase());
      })
    : sorted;

  const displayed = filtered.slice(0, 12);

  return (
    <>
      {/* Use-case filter chips */}
      {useCaseFilters && useCaseFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              !activeFilter
                ? "border-[#7371FC] bg-[#7371FC] text-white"
                : "border-border bg-white text-muted-foreground hover:border-[#7371FC]/50 hover:text-[#7371FC]"
            }`}
          >
            All
          </button>
          {useCaseFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === f
                  ? "border-[#7371FC] bg-[#7371FC] text-white"
                  : "border-border bg-white text-muted-foreground hover:border-[#7371FC]/50 hover:text-[#7371FC]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {displayed.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayed.map((product) => {
            const price = product.prices?.find((p) => p.priceType === "b2c");
            const img = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

            return (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="relative aspect-square bg-secondary/20">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <HeroIcon className="h-12 w-12 text-muted-foreground/15" />
                      </div>
                    )}
                    {product.purityPercent && (
                      <div className="absolute right-2 top-2">
                        <Badge className="bg-white/90 text-[#7371FC] text-[10px] gap-1 shadow-sm">
                          <Award className="h-3 w-3" />
                          {product.purityPercent}%
                        </Badge>
                      </div>
                    )}
                    {product.isFeatured && (
                      <div className="absolute left-2 top-2">
                        <Badge className="bg-amber-500 text-[10px] text-white shadow-sm gap-0.5">
                          <Award className="h-2.5 w-2.5" /> Staff Pick
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <StockBadge productId={product.id} />
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <CompareCheckbox product={{
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: price ? Number(price.amount) : 0,
                        image: img?.url ?? null,
                        strength: product.strength,
                        dosageForm: product.dosageForm,
                        packSize: product.packSize,
                        manufacturer: product.manufacturer,
                      }} />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    {product.category && (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {product.category.name}
                      </p>
                    )}
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[#010128] group-hover:text-[#7371FC]">
                      {product.name}
                    </h3>
                    <ProductRating productId={product.id} />
                    {product.shortDescription && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {product.shortDescription}
                      </p>
                    )}
                    {product.manufacturer && (
                      <p className="mt-1 text-xs text-muted-foreground">{product.manufacturer}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {price && (
                        <p className="inline-block rounded-full bg-[#7371FC]/10 px-3 py-1 text-sm font-bold text-[#7371FC]">
                          ${Number(price.amount).toFixed(2)}
                        </p>
                      )}
                      {!product.requiresPrescription && (
                        <QuickAddButton
                          productId={product.id}
                          name={product.name}
                          slug={product.slug}
                          price={price ? Number(price.amount) : 0}
                          image={img?.url ?? null}
                          strength={product.strength}
                          dosageForm={product.dosageForm}
                          packSize={product.packSize}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed py-16 text-center">
          <HeroIcon className="mx-auto h-10 w-10 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">
            {activeFilter ? `No products match "${activeFilter}". Try another filter.` : "No products in this category yet. Check back soon!"}
          </p>
        </div>
      )}
    </>
  );
}
