"use client";

import { useCompare, type CompareProduct } from "@/lib/compare-context";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export function CompareCheckbox({ product }: { product: CompareProduct }) {
  const { addItem, removeItem, isInCompare, items } = useCompare();
  const checked = isInCompare(product.id);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (checked) {
      removeItem(product.id);
    } else {
      if (items.length >= 3) {
        toast.error("You can compare up to 3 products at a time");
        return;
      }
      addItem(product);
    }
  }

  return (
    <button
      onClick={handleClick}
      title={checked ? "Remove from compare" : "Add to compare"}
      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-all ${
        checked
          ? "border-[#7371FC] bg-[#7371FC] text-white"
          : "border-border bg-white/90 text-muted-foreground hover:border-[#7371FC]/50 hover:text-[#7371FC]"
      }`}
    >
      <ArrowLeftRight className="h-2.5 w-2.5" />
      {checked ? "Comparing" : "Compare"}
    </button>
  );
}
