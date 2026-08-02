"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Tag } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface PromoBanner {
  id: string;
  title: string;
  highlight: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export function PromoStrip() {
  const [promo, setPromo] = useState<PromoBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed this session
    const dismissedId = sessionStorage.getItem("promo_dismissed");

    fetch(`${API_URL}/api/banners?placement=promo_strip&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          const banner = d.data[0];
          if (banner.id !== dismissedId) {
            setPromo(banner);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!promo || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    if (promo) sessionStorage.setItem("promo_dismissed", promo.id);
  }

  return (
    <div className="relative bg-white/10 backdrop-blur-md border-b border-white/20 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 text-sm text-primary">
        <Tag className="h-4 w-4 shrink-0" />
        <p className="text-center">
          <span className="font-semibold">{promo.title}</span>
          {promo.highlight && (
            <span className="ml-1 font-bold">{promo.highlight}</span>
          )}
          {promo.description && (
            <span className="ml-1 hidden sm:inline text-primary/70">
              — {promo.description}
            </span>
          )}
        </p>
        {promo.ctaUrl && (
          <Link
            href={promo.ctaUrl}
            className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent/30"
          >
            {promo.ctaLabel || "Shop Now"}
          </Link>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-primary/60 transition hover:bg-primary/10 hover:text-primary"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
