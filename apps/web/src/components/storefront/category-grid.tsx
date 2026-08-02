"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical, Pill, Leaf, Heart, Stethoscope, HeartPulse,
  BriefcaseMedical, ShieldCheck, Syringe, Award, ArrowRight,
  type LucideIcon,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
      {categories.map((cat) => {
        const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
        const gradient = GRADIENT_MAP[cat.slug] || DEFAULT_GRADIENT;
        const imgUrl = cat.megaMenuImageUrl || cat.heroImageUrl;

        return (
          <Link
            key={cat.slug}
            href={`/products/category/${cat.slug}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md transition-shadow duration-500 hover:shadow-xl hover:shadow-black/15 sm:aspect-[4/5]"
          >
            {/* Background image or gradient */}
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt={cat.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
                <Icon
                  className="absolute -right-2 -top-2 h-28 w-28 text-white/10 sm:h-36 sm:w-36"
                  strokeWidth={1}
                />
              </div>
            )}

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#010128]/90 via-[#010128]/25 to-transparent transition-opacity duration-500 group-hover:from-[#010128]/95" />

            {/* Icon badge — top left */}
            <div
              className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>

            {/* Bottom content */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <h3 className="text-base font-bold leading-tight text-white sm:text-xl">
                {cat.name}
              </h3>
              {cat.description && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/60 sm:text-xs">
                  {cat.description}
                </p>
              )}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/20 transition-all duration-300 group-hover:bg-white group-hover:text-[#010128]">
                Shop Now
                <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
