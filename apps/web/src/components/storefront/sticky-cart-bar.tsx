"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";

interface StickyProduct {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  requiresPrescription: boolean;
  genericName?: string | null;
}

export function StickyCartBar() {
  const [product, setProduct] = useState<StickyProduct | null>(null);
  const [visible, setVisible] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    function handleStickyProduct(e: CustomEvent<StickyProduct>) {
      setProduct(e.detail);
      setVisible(true);
    }

    window.addEventListener(
      "sticky-cart-product" as string,
      handleStickyProduct as EventListener
    );
    return () =>
      window.removeEventListener(
        "sticky-cart-product" as string,
        handleStickyProduct as EventListener
      );
  }, []);

  if (!visible || !product) return null;

  function handleAdd() {
    if (!product) return;
    addItem({
      productId: product.productId,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      strength: product.strength,
      dosageForm: product.dosageForm,
      packSize: product.packSize,
      requiresPrescription: product.requiresPrescription,
      genericName: product.genericName,
    });
    toast.success(`${product.name} added to cart`);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 translate-y-0 animate-slide-up">
      <div className="border-t bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3">
          {product.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="hidden h-10 w-10 shrink-0 rounded-lg border object-cover sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-primary sm:text-sm">
              {product.name}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {[product.strength, product.dosageForm, product.packSize]
                .filter(Boolean)
                .join(" · ") || "Quick add to cart"}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-accent sm:text-base">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:bg-accent/90 hover:shadow-lg active:scale-95 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button
            onClick={() => setVisible(false)}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:p-1.5"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Helper to dispatch the sticky cart event from product cards
export function showStickyCart(product: StickyProduct) {
  window.dispatchEvent(
    new CustomEvent("sticky-cart-product", { detail: product })
  );
}
