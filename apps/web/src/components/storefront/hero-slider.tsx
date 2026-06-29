"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Fallback slides when no banners exist in DB yet
const FALLBACK_SLIDES = [
  {
    id: "fallback-1",
    badgeText: "Research Grade - Third-Party Tested",
    title: "Premium Peptides &",
    highlight: "Research Compounds",
    description:
      "High-purity BPC-157, TB-500, Ipamorelin and more. Every batch independently verified with a Certificate of Analysis.",
    ctaLabel: "Shop Peptides",
    ctaUrl: "/products/category/peptides",
    imageUrl: null as string | null,
  },
  {
    id: "fallback-2",
    badgeText: "OTC - Fast Nationwide Shipping",
    title: "Trusted OTC",
    highlight: "Medicines",
    description:
      "Pain relief, cold & flu, allergy treatments. Licensed US supplier with same-day dispatch on orders placed before 2 PM.",
    ctaLabel: "Shop OTC Medicines",
    ctaUrl: "/products/category/otc",
    imageUrl: null as string | null,
  },
  {
    id: "fallback-3",
    badgeText: "Vitamins - Supplements - Wellness",
    title: "Vitamins &",
    highlight: "Supplements",
    description:
      "Premium Vitamin D, C, Omega-3, Multivitamins and more. Sourced from trusted manufacturers and independently quality-checked.",
    ctaLabel: "Shop Vitamins",
    ctaUrl: "/products/category/vitamins",
    imageUrl: null as string | null,
  },
  {
    id: "fallback-4",
    badgeText: "First Aid - Medical Devices",
    title: "First Aid &",
    highlight: "Medical Supplies",
    description:
      "Bandages, antiseptics, emergency kits, thermometers and BP monitors. Everything you need — ready to ship nationwide.",
    ctaLabel: "Shop First Aid",
    ctaUrl: "/products/category/first-aid",
    imageUrl: null as string | null,
  },
];

interface Slide {
  id: string;
  badgeText: string | null;
  title: string;
  highlight: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  overlayOpacity?: number;
  textColor?: string;
}

export function HeroSlider() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);

  // Fetch banners from API
  useEffect(() => {
    fetch(`${API_URL}/api/banners?placement=homepage_hero&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setSlides(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const next = useCallback(
    () => setCurrent((i) => (i + 1) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [current, next]);

  return (
    <section className="relative overflow-hidden bg-primary text-white">
      {/* Background images — stacked, crossfade */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          {slide.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {/* Dark overlay for text readability — opacity controlled per slide */}
              <div
                className="absolute inset-0 bg-[#010128]"
                style={{ opacity: (slide.overlayOpacity ?? 60) / 100 }}
              />
            </>
          ) : (
            /* Decorative gradient fallback */
            <div className="absolute inset-0 bg-primary">
              <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-accent/10" />
            </div>
          )}
        </div>
      ))}

      {/* Slide content — stacked in grid cell, crossfade */}
      <div className="relative grid">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            style={{ gridArea: "1 / 1" }}
            className={`px-4 pb-16 pt-10 transition-all duration-500 sm:pb-20 sm:pt-16 ${
              i === current
                ? "z-10 translate-y-0 opacity-100"
                : "pointer-events-none z-0 translate-y-4 opacity-0"
            }`}
          >
            <div className={`relative mx-auto max-w-7xl ${slide.textColor === "dark" ? "text-[#010128]" : "text-white"}`}>
              {slide.badgeText && (
                <Badge className={`mb-3 text-[10px] sm:mb-4 sm:text-xs ${slide.textColor === "dark" ? "border-[#010128]/20 bg-[#010128]/10 text-[#010128]" : "border-accent/40 bg-accent/20 text-white"}`}>
                  {slide.badgeText}
                </Badge>
              )}
              <h1 className="text-2xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
                {slide.title}
                {slide.highlight && (
                  <>
                    <br />
                    <span className={slide.textColor === "dark" ? "text-[#7371FC]" : "text-[#A594F9]"}>{slide.highlight}</span>
                  </>
                )}
              </h1>
              {slide.description && (
                <p className={`mt-3 max-w-xl text-sm leading-relaxed sm:mt-5 sm:text-lg ${slide.textColor === "dark" ? "text-[#010128]/70" : "text-white/80"}`}>
                  {slide.description}
                </p>
              )}
              <div className="mt-5 flex gap-3 sm:mt-8 sm:flex-wrap sm:gap-4">
                {slide.ctaUrl && (
                  <Link href={slide.ctaUrl} className="flex-1 sm:flex-none">
                    <Button
                      size="lg"
                      className="w-full bg-accent text-white hover:bg-accent/90 sm:w-auto"
                    >
                      {slide.ctaLabel || "Shop Now"}
                    </Button>
                  </Link>
                )}
                <Link href="/products" className="flex-1 sm:flex-none">
                  {slide.textColor === "dark" ? (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full !border-[#010128]/30 !text-[#010128] hover:!bg-[#010128]/5 sm:w-auto"
                    >
                      All Products
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full border border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
                    >
                      All Products
                    </Button>
                  )}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation — dots on mobile, pills on sm+ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-1.5 px-4 pb-4 sm:gap-2">
        {slides.map((slide, i) => {
          const dark = slides[current]?.textColor === "dark";
          return (
          <button
            key={slide.id}
            onClick={() => setCurrent(i)}
            className={`relative overflow-hidden rounded-full transition-all duration-300 ${
              i === current
                ? dark
                  ? "h-2.5 w-2.5 bg-[#010128] sm:bg-[#010128]/20 sm:px-4 sm:py-1.5 sm:h-auto sm:w-auto sm:text-[#010128] sm:backdrop-blur-sm"
                  : "h-2.5 w-2.5 bg-white sm:bg-white/20 sm:px-4 sm:py-1.5 sm:h-auto sm:w-auto sm:text-white sm:backdrop-blur-sm"
                : dark
                  ? "h-2 w-2 bg-[#010128]/30 sm:bg-[#010128]/8 sm:px-4 sm:py-1.5 sm:h-auto sm:w-auto sm:text-[#010128]/50 sm:hover:bg-[#010128]/15 sm:hover:text-[#010128]/80"
                  : "h-2 w-2 bg-white/30 sm:bg-white/8 sm:px-4 sm:py-1.5 sm:h-auto sm:w-auto sm:text-white/50 sm:hover:bg-white/15 sm:hover:text-white/80"
            }`}
          >
            <span className="hidden text-xs font-semibold tracking-wide sm:inline">
              {slide.title.split(" ").slice(0, 2).join(" ")}
            </span>
            {i === current && (
              <span
                key={current}
                className="absolute bottom-0 left-0 hidden h-0.5 bg-accent sm:block"
                style={{ animation: "slide-progress 5s linear forwards" }}
              />
            )}
          </button>
          );
        })}
      </div>
    </section>
  );
}
