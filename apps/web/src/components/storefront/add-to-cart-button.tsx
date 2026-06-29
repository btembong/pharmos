"use client";

import { useState } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Minus, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface AddToCartButtonProps {
  product: Omit<CartItem, "quantity">;
  showQuantity?: boolean;
}

export function AddToCartButton({ product, showQuantity = false }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Block Rx products
  if (product.requiresPrescription) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FileText className="h-4 w-4 shrink-0" />
          <span>Prescription Required — Not available for online purchase</span>
        </div>
        <Link href="/contact">
          <Button variant="outline" size="lg" className="w-full">
            Contact Us to Order
          </Button>
        </Link>
      </div>
    );
  }

  function handleAdd() {
    addItem(product, quantity);
    setAdded(true);
    toast.success(`${product.name} added to cart`, {
      description:
        quantity > 1
          ? `${quantity} units · ${product.packSize || product.dosageForm || ""}`
          : product.packSize || product.dosageForm || undefined,
      duration: 2500,
    });
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      {showQuantity && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <div className="flex items-center overflow-hidden rounded-full border">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <span className="w-10 text-center text-sm font-semibold tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={handleAdd}>
        {added ? (
          <>
            <Check className="mr-2 h-5 w-5" /> Added to Cart
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
          </>
        )}
      </Button>
    </div>
  );
}
