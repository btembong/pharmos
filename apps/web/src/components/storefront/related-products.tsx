"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FlaskConical, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import { useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  prices: { amount: number; priceType: string }[] | null;
  strength: string | null;
  dosageForm: string | null;
}

export function RelatedProducts({ categorySlug, currentProductId }: { categorySlug: string; currentProductId: string }) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/products?categorySlug=${categorySlug}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.data || []).filter((p: RelatedProduct) => p.id !== currentProductId);
        setProducts(filtered.slice(0, 6));
      })
      .catch(() => {});
  }, [categorySlug, currentProductId]);

  if (products.length === 0) return null;

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -250 : 250, behavior: "smooth" });
  }

  function quickAdd(p: RelatedProduct) {
    const img = p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null;
    const price = p.prices?.find((pr) => pr.priceType === "b2c");
    addItem({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      price: price ? Number(price.amount) : 0,
      image: img,
      strength: p.strength,
      dosageForm: p.dosageForm,
      packSize: null,
      requiresPrescription: false,
    });
    toast.success(`${p.name} added to cart`);
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-primary">Related Products</h2>
        <div className="flex gap-1">
          <button onClick={() => scroll("left")} className="rounded-full border p-1.5 hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll("right")} className="rounded-full border p-1.5 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {products.map((p) => {
          const img = p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url;
          const price = p.prices?.find((pr) => pr.priceType === "b2c");
          return (
            <div key={p.id} className="w-[200px] shrink-0 rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-md">
              <Link href={`/products/${p.slug}`}>
                <div className="aspect-square bg-secondary/20">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FlaskConical className="h-10 w-10 text-muted-foreground/15" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-accent">
                  {p.name}
                </Link>
                {price && (
                  <p className="mt-1 text-sm font-bold text-accent">${Number(price.amount).toFixed(2)}</p>
                )}
                <button
                  onClick={() => quickAdd(p)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetch(`${API_URL}/api/ai/recommendations/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.data?.products || [];
        setProducts(items.slice(0, 3));
      })
      .catch(() => {});
  }, [productId]);

  if (products.length === 0) return null;

  function addAll() {
    products.forEach((p) => {
      const img = p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null;
      const price = p.prices?.find((pr) => pr.priceType === "b2c");
      addItem({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: price ? Number(price.amount) : 0,
        image: img,
        strength: p.strength,
        dosageForm: p.dosageForm,
        packSize: null,
        requiresPrescription: false,
      });
    });
    toast.success(`${products.length} items added to cart`);
  }

  const totalPrice = products.reduce((sum, p) => {
    const price = p.prices?.find((pr) => pr.priceType === "b2c");
    return sum + (price ? Number(price.amount) : 0);
  }, 0);

  return (
    <section className="mt-8 rounded-xl border bg-secondary/10 p-5">
      <h2 className="text-sm font-bold text-primary mb-4">Frequently Bought Together</h2>
      <div className="flex flex-wrap items-center gap-3">
        {products.map((p, i) => {
          const img = p.images?.find((im) => im.isPrimary)?.url ?? p.images?.[0]?.url;
          const price = p.prices?.find((pr) => pr.priceType === "b2c");
          return (
            <div key={p.id} className="flex items-center gap-3">
              {i > 0 && <span className="text-lg text-muted-foreground">+</span>}
              <Link href={`/products/${p.slug}`} className="flex items-center gap-2 rounded-lg border bg-white p-2 hover:shadow-sm">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name} className="h-12 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary/30">
                    <FlaskConical className="h-5 w-5 text-muted-foreground/20" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold line-clamp-1">{p.name}</p>
                  {price && <p className="text-xs font-bold text-accent">${Number(price.amount).toFixed(2)}</p>}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={addAll}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ShoppingCart className="h-4 w-4" />
          Add All to Cart — ${totalPrice.toFixed(2)}
        </button>
      </div>
    </section>
  );
}
