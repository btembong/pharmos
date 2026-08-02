"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Award, Flame, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import { showStickyCart } from "./sticky-cart-bar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Product {
  id: string;
  name: string;
  slug: string;
  manufacturer: string | null;
  purityPercent: number | null;
  isResearchCompound: boolean;
  requiresPrescription?: boolean;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  genericName?: string | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category: { name: string; slug: string } | null;
  prices: { amount: string; priceType: string }[];
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const price = product.prices?.find((p) => p.priceType === "b2c");
  const img = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!price) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(price.amount),
      image: img?.url || null,
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
      image: img?.url || null,
      strength: product.strength || null,
      dosageForm: product.dosageForm || null,
      packSize: product.packSize || null,
      requiresPrescription: product.requiresPrescription || false,
      genericName: product.genericName,
    });
  }

  return (
    <Link href={`/products/${product.slug}`} className="group w-64 shrink-0" onMouseEnter={handleHover}>
      <div className="overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-square bg-secondary/20">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.url}
              alt={img.alt}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground/15" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex gap-1.5">
            <Badge className="bg-orange-500/90 text-white text-[10px] gap-1">
              <Flame className="h-3 w-3" />
              Best Seller
            </Badge>
          </div>
          {product.purityPercent && (
            <div className="absolute right-2 top-2">
              <Badge className="bg-white/90 text-accent text-[10px] gap-1 shadow-sm">
                <Award className="h-3 w-3" />
                {product.purityPercent}% Pure
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
        <div className="p-3.5">
          {product.category && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-primary group-hover:text-accent">
            {product.name}
          </h3>
          {product.manufacturer && (
            <p className="mt-0.5 text-xs text-muted-foreground">{product.manufacturer}</p>
          )}
          {price && (
            <p className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
              ${Number(price.amount).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/products/best-sellers`)
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 animate-pulse rounded-xl border bg-muted/40 p-4">
            <div className="aspect-square rounded-lg bg-muted" />
            <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  const items = [...products, ...products];
  const duration = products.length * 4;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-4"
        style={{
          animation: `marquee-scroll-reverse ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((product, i) => (
          <ProductCard key={`${product.id}-${i}`} product={product} />
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
