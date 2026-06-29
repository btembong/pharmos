"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical, Pill, Leaf, Heart, Stethoscope, HeartPulse,
  BriefcaseMedical, ShieldCheck, Syringe, Award, ArrowRight,
  type LucideIcon,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const ICON_MAP: Record<string, LucideIcon> = {
  FlaskConical, Pill, Leaf, Heart, Stethoscope, HeartPulse,
  BriefcaseMedical, ShieldCheck, Syringe, Award,
};

const GRADIENT_MAP: Record<string, string> = {
  peptides: "from-[#7371FC] to-[#A594F9]",
  otc: "from-[#010128] to-[#7371FC]",
  vitamins: "from-[#A594F9] to-[#E5D9F2]",
  "first-aid": "from-[#7371FC] to-[#010128]",
  "medical-devices": "from-[#010128] to-[#A594F9]",
  "personal-care": "from-[#A594F9] to-[#7371FC]",
};
const DEFAULT_GRADIENT = "from-[#7371FC] to-[#A594F9]";

interface Category {
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  heroImageUrl: string | null;
  megaMenuImageUrl: string | null;
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/products/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setCategories(d.data);
      })
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {categories.map((cat, i) => {
        const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
        const gradient = GRADIENT_MAP[cat.slug] || DEFAULT_GRADIENT;
        const imgUrl = cat.megaMenuImageUrl || cat.heroImageUrl;

        return (
          <Link
            key={cat.slug}
            href={`/products/category/${cat.slug}`}
            className="group relative overflow-hidden rounded-xl p-[1px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#7371FC]/10 sm:rounded-2xl"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Animated gradient border */}
            <div
              className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-30 sm:rounded-2xl`}
            />

            <div className="relative flex h-full flex-col rounded-xl bg-white sm:rounded-2xl">
              {/* Image or icon */}
              {imgUrl ? (
                <div className="relative h-24 overflow-hidden rounded-t-xl sm:h-40 sm:rounded-t-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity duration-500 group-hover:from-black/60" />
                  <div className="absolute bottom-2 left-2.5 transition-transform duration-300 group-hover:translate-y-[-2px] sm:bottom-3 sm:left-4">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${gradient} shadow-lg transition-shadow duration-300 group-hover:shadow-xl sm:h-9 sm:w-9 sm:rounded-lg`}
                    >
                      <Icon className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 pb-0 sm:p-6 sm:pb-0">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-md transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#7371FC]/20 sm:h-14 sm:w-14 sm:rounded-xl`}
                  >
                    <Icon className="h-4 w-4 text-white transition-transform duration-300 group-hover:rotate-[-8deg] sm:h-6 sm:w-6" />
                  </div>
                </div>
              )}

              <div className={imgUrl ? "p-3 sm:p-5" : "p-3 pt-2.5 sm:p-6 sm:pt-4"}>
                <h3 className="text-sm font-bold text-[#010128] transition-colors duration-300 group-hover:text-[#7371FC] sm:text-lg">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="mt-0.5 line-clamp-2 hidden text-sm leading-relaxed text-muted-foreground sm:mt-1.5 sm:block">
                    {cat.description}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#7371FC] opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100 sm:mt-4 sm:gap-1.5 sm:text-sm">
                  Browse <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
