"use client";

import { useState, useEffect } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

interface StickyMobileATCProps {
  product: Omit<CartItem, "quantity">;
  price: number;
}

export function StickyMobileATC({ product, price }: StickyMobileATCProps) {
  const { addItem } = useCart();
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    function handleScroll() {
      // Show after scrolling past 400px (past the purchase box)
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible || product.requiresPrescription) return null;

  function handleAdd() {
    addItem(product);
    setAdded(true);
    toast.success(`${product.name} added to cart`);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
          <p className="text-lg font-bold text-accent">${price.toFixed(2)}</p>
        </div>
        <button
          onClick={handleAdd}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all ${
            added ? "bg-green-500" : "bg-primary hover:bg-primary/90"
          }`}
        >
          {added ? (
            <><Check className="h-4 w-4" /> Added</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> Add to Cart</>
          )}
        </button>
      </div>
    </div>
  );
}
