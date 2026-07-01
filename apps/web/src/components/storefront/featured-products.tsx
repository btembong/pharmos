"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Microscope,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import { showStickyCart } from "./sticky-cart-bar";

interface Product {
  id: string;
  name: string;
  slug: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  manufacturer: string | null;
  isResearchCompound?: boolean;
  requiresPrescription?: boolean;
  purityPercent?: number | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category?: { name: string } | null;
  prices?: { amount: number; priceType: string }[] | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const imageUrl =
    product.images?.find((i) => i.isPrimary)?.url ??
    product.images?.[0]?.url;
  const price = product.prices?.find((p) => p.priceType === "b2c");

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!price) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(price.amount),
      image: imageUrl || null,
      strength: product.strength || null,
      dosageForm: product.dosageForm || null,
      packSize: product.packSize || null,
      requiresPrescription: product.requiresPrescription || false,
      genericName: product.genericName,
    });
    toast.success(`${product.name} added to cart`);
  }

  function handleHover() {
    if (!price) return;
    showStickyCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(price.amount),
      image: imageUrl || null,
      strength: product.strength || null,
      dosageForm: product.dosageForm || null,
      packSize: product.packSize || null,
      requiresPrescription: product.requiresPrescription || false,
      genericName: product.genericName,
    });
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group w-56 shrink-0 sm:w-60"
      onMouseEnter={handleHover}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative overflow-hidden bg-secondary/30">
          <div className="aspect-[4/5]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={product.name}
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

          {product.isResearchCompound && product.purityPercent && (
            <div className="absolute right-2 top-2">
              <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {product.purityPercent}%
              </span>
            </div>
          )}

          {product.category && (
            <div className="absolute left-2 top-2">
              <Badge className="bg-accent/90 text-[10px] text-white shadow-sm">
                {product.category.name}
              </Badge>
            </div>
          )}

          {/* Quick Add to Cart — visible on hover */}
          {price && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all duration-300 hover:bg-accent/90 hover:scale-110"
              aria-label="Add to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-accent">
            {product.name}
          </h3>
          {product.genericName && (
            <p className="line-clamp-1 text-xs italic text-muted-foreground">
              {product.genericName}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 shrink-0 text-accent/50" />
              <span className="line-clamp-1 text-[10px] text-muted-foreground/70">
                {product.manufacturer ?? "Licensed US Supplier"}
              </span>
            </div>
            {price && (
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                ${Number(price.amount).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/products?isFeatured=true&limit=12`)
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-56 shrink-0 animate-pulse rounded-xl border bg-muted/20 sm:w-60">
            <div className="aspect-[4/5] bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...products, ...products];
  const duration = products.length * 4; // 4s per card

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-4"
        style={{
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((product, i) => (
          <ProductCard key={`${product.id}-${i}`} product={product} />
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
