"use client";

import { useCompare } from "@/lib/compare-context";
import { X, ArrowLeftRight, FlaskConical } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function CompareBar() {
  const { items, removeItem, clear, showDrawer, setShowDrawer } = useCompare();

  if (items.length === 0) return null;

  return (
    <>
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#7371FC]" />
            <span className="text-sm font-semibold text-[#010128]">Compare ({items.length}/3)</span>
          </div>
          <div className="flex flex-1 items-center gap-3 overflow-x-auto">
            {items.map((item) => (
              <div key={item.id} className="flex shrink-0 items-center gap-2 rounded-lg border bg-secondary/20 px-3 py-1.5">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary/40">
                    <FlaskConical className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
                <span className="max-w-[120px] truncate text-xs font-medium">{item.name}</span>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={clear} className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-secondary/30">
              Clear
            </button>
            <button
              onClick={() => setShowDrawer(true)}
              disabled={items.length < 2}
              className="rounded-lg bg-[#7371FC] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Compare Now
            </button>
          </div>
        </div>
      </div>

      {/* Compare modal */}
      {showDrawer && <CompareModal />}
    </>
  );
}

function CompareModal() {
  const { items, setShowDrawer, clear } = useCompare();
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
    setTimeout(() => setShowDrawer(false), 200);
  }

  const fields: { label: string; key: keyof typeof items[0] | "price" }[] = [
    { label: "Price", key: "price" },
    { label: "Strength", key: "strength" },
    { label: "Dosage Form", key: "dosageForm" },
    { label: "Pack Size", key: "packSize" },
    { label: "Manufacturer", key: "manufacturer" },
  ];

  return (
    <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/50 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}>
      <div
        className={`w-full max-w-5xl rounded-t-2xl bg-white px-6 py-6 shadow-2xl transition-transform duration-200 ${closing ? "translate-y-full" : "translate-y-0"}`}
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#010128]">Compare Products</h2>
          <button onClick={handleClose} className="rounded-full p-2 hover:bg-secondary/30">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-32" />
                {items.map((item) => (
                  <th key={item.id} className="px-4 pb-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary/30">
                          <FlaskConical className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={handleClose}
                        className="text-sm font-semibold text-[#010128] hover:text-[#7371FC]"
                      >
                        {item.name}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.label} className="border-t">
                  <td className="py-3 pr-4 text-xs font-semibold text-muted-foreground">{field.label}</td>
                  {items.map((item) => {
                    let value: string | number | null = item[field.key as keyof typeof item] as string | number | null;
                    if (field.key === "price") {
                      value = `$${Number(value).toFixed(2)}`;
                    }
                    return (
                      <td key={item.id} className="px-4 py-3 text-center text-sm">
                        {value ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button onClick={handleClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary/30">
            Close
          </button>
          <button
            onClick={() => { clear(); handleClose(); }}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
