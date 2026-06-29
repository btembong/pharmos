"use client";

import { useCart } from "@/lib/cart-context";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface QuickAddProps {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
}

export function QuickAddButton(props: QuickAddProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: props.productId,
      name: props.name,
      slug: props.slug,
      price: props.price,
      image: props.image,
      strength: props.strength,
      dosageForm: props.dosageForm,
      packSize: props.packSize,
      requiresPrescription: false,
    });
    setAdded(true);
    toast.success(`${props.name} added to cart`);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
        added
          ? "bg-green-500 text-white"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {added ? (
        <><Check className="h-3 w-3" /> Added</>
      ) : (
        <><ShoppingCart className="h-3 w-3" /> Add</>
      )}
    </button>
  );
}
