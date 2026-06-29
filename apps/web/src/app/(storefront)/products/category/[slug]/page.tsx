import { apiClient } from "@/lib/api-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  ShieldCheck,
  Award,
  Microscope,
  Truck,
  Heart,
  Pill,
  Stethoscope,
  Leaf,
  Syringe,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  BriefcaseMedical,
  HeartPulse,
} from "lucide-react";
import { CategoryReviews } from "@/components/storefront/category-reviews";
import { FAQAccordion } from "@/components/storefront/faq-accordion";
import { CategoryProductGrid } from "@/components/storefront/category-product-grid";
import { ResearchDisclaimerGate } from "@/components/storefront/research-disclaimer-gate";

export const revalidate = 300;

// ─── Category config with Pharmos brand color combos ─────────────────────────

interface CategoryConfig {
  headline: string;
  subtext: string;
  heroBg: string;
  heroText: string;
  heroAccent: string;
  badgeBg: string;
  sectionBg: string;
  benefitIconBg: string;
  benefitIconColor: string;
  icon: typeof FlaskConical;
  iconName: string;
  benefits: { icon: typeof FlaskConical; title: string; desc: string }[];
  trustText: string;
  disclaimer?: string;
  faqs?: { q: string; a: string }[];
  useCaseFilters?: string[];
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  peptides: {
    headline: "Research-Grade Peptides",
    subtext:
      "Premium peptides for in-vitro research. Every batch independently tested with HPLC purity data and Certificate of Analysis included.",
    heroBg: "bg-[#010128]",
    heroText: "text-white",
    heroAccent: "text-[#A594F9]",
    badgeBg: "bg-[#7371FC]",
    sectionBg: "bg-[#F5EFFF]",
    benefitIconBg: "bg-[#7371FC]/10",
    benefitIconColor: "text-[#7371FC]",
    icon: FlaskConical,
    iconName: "FlaskConical",
    benefits: [
      { icon: Award, title: "≥ 99% Purity (HPLC)", desc: "Every batch verified by independent third-party labs with full HPLC and mass spectrometry data." },
      { icon: ShieldCheck, title: "Certificate of Analysis", desc: "Download the COA for any product. Full transparency on purity, molecular weight, and sequence." },
      { icon: Microscope, title: "Research-Grade Quality", desc: "Synthesized under strict quality controls. Intended exclusively for in-vitro laboratory research." },
      { icon: Truck, title: "Cold-Chain Shipping", desc: "Temperature-sensitive peptides shipped with cold packs to maintain stability and potency." },
    ],
    trustText: "All peptides are sold strictly for in-vitro research use. Not for human consumption.",
    disclaimer:
      "For Research Use Only. These products are intended strictly for in-vitro laboratory research. Not for human or veterinary use.",
    faqs: [
      { q: "What purity levels are your peptides?", a: "All our peptides are ≥99% purity as verified by independent HPLC analysis. A Certificate of Analysis is included with every order." },
      { q: "How are peptides shipped?", a: "Temperature-sensitive peptides are shipped with cold packs via expedited shipping to maintain stability and potency." },
      { q: "Are these peptides for human use?", a: "No. All peptides are sold strictly for in-vitro laboratory research purposes. They are not intended for human or veterinary use." },
      { q: "Do you provide Certificates of Analysis?", a: "Yes, every batch comes with a full COA including HPLC purity data, mass spectrometry results, and sequence verification." },
    ],
    useCaseFilters: ["Recovery", "Anti-aging", "Muscle Growth", "Fat Loss", "Cognitive", "Healing"],
  },
  otc: {
    headline: "Over-the-Counter Medicines",
    subtext:
      "Trusted OTC medications for pain relief, cold & flu, allergy, digestive health, and more. Fast US shipping.",
    heroBg: "bg-[#010128]",
    heroText: "text-white",
    heroAccent: "text-[#7371FC]",
    badgeBg: "bg-[#7371FC]",
    sectionBg: "bg-[#F5EFFF]",
    benefitIconBg: "bg-blue-500/10",
    benefitIconColor: "text-blue-600",
    icon: Pill,
    iconName: "Pill",
    benefits: [
      { icon: ShieldCheck, title: "FDA-Approved Brands", desc: "Only carry products from trusted, FDA-approved manufacturers." },
      { icon: Heart, title: "Health & Wellness", desc: "Comprehensive range covering pain, cold & flu, allergy, digestive, and sleep support." },
      { icon: Truck, title: "Fast US Shipping", desc: "Free shipping on orders over $99. Most orders dispatched within 48 hours." },
      { icon: CheckCircle2, title: "Licensed Supplier", desc: "State-licensed pharmacy supplier. Every product verified authentic." },
    ],
    trustText: "All OTC products are sourced from licensed US distributors and verified for authenticity.",
    faqs: [
      { q: "Are your OTC medications FDA-approved?", a: "Yes, we only carry OTC medications from FDA-approved manufacturers sourced through licensed US distributors." },
      { q: "Do I need a prescription for OTC products?", a: "No. Over-the-counter medications can be purchased without a prescription." },
      { q: "How quickly will my OTC order ship?", a: "Most orders placed before 2 PM ET ship same day. Standard delivery is 3-7 business days." },
      { q: "Can I return OTC medications?", a: "For safety reasons, medications cannot be returned once shipped. Please contact us if you receive a damaged or incorrect product." },
    ],
    useCaseFilters: ["Pain Relief", "Cold & Flu", "Allergy", "Digestive", "Sleep", "Skin Care"],
  },
  vitamins: {
    headline: "Vitamins & Supplements",
    subtext:
      "Premium vitamins, minerals, and dietary supplements. Lab-tested for potency and purity.",
    heroBg: "bg-[#010128]",
    heroText: "text-white",
    heroAccent: "text-[#A594F9]",
    badgeBg: "bg-[#A594F9]",
    sectionBg: "bg-[#F5EFFF]",
    benefitIconBg: "bg-green-500/10",
    benefitIconColor: "text-green-600",
    icon: Leaf,
    iconName: "Leaf",
    benefits: [
      { icon: Award, title: "Third-Party Tested", desc: "Every supplement batch is independently tested for potency, purity, and contaminants." },
      { icon: ShieldCheck, title: "GMP Certified", desc: "Sourced from GMP-certified facilities following strict manufacturing standards." },
      { icon: Leaf, title: "Clean Formulas", desc: "No unnecessary fillers. Clean, science-backed formulations you can trust." },
      { icon: Truck, title: "Free Shipping Over $99", desc: "Fast delivery across the US. Free standard shipping on qualifying orders." },
    ],
    trustText: "All supplements are manufactured in GMP-certified facilities.",
    disclaimer:
      "*These statements have not been evaluated by the FDA. These products are not intended to diagnose, treat, cure, or prevent any disease.",
    faqs: [
      { q: "Are your supplements third-party tested?", a: "Yes, every batch is independently tested for potency, purity, and contaminants by accredited labs." },
      { q: "Are your supplements GMP certified?", a: "All our supplements are manufactured in GMP-certified facilities following strict quality standards." },
      { q: "Do your supplements contain artificial fillers?", a: "We prioritize clean formulations. Product labels list all ingredients — check individual product pages for full details." },
      { q: "How should I store my supplements?", a: "Store in a cool, dry place away from direct sunlight. Some products may require refrigeration — check the product label." },
    ],
    useCaseFilters: ["Vitamins", "Minerals", "Probiotics", "Omega-3", "Immune Support", "Energy"],
  },
  "first-aid": {
    headline: "First Aid Essentials",
    subtext:
      "Complete first aid supplies — bandages, antiseptics, wound care, emergency kits, and more.",
    heroBg: "bg-[#010128]",
    heroText: "text-white",
    heroAccent: "text-[#E5D9F2]",
    badgeBg: "bg-[#7371FC]",
    sectionBg: "bg-[#F5EFFF]",
    benefitIconBg: "bg-red-500/10",
    benefitIconColor: "text-red-600",
    icon: Heart,
    iconName: "Heart",
    benefits: [
      { icon: ShieldCheck, title: "Hospital-Grade Quality", desc: "The same quality supplies used in hospitals and clinics, available for home use." },
      { icon: CheckCircle2, title: "Ready When You Need It", desc: "Pre-assembled kits and individual supplies to keep you prepared for emergencies." },
      { icon: Truck, title: "Fast Dispatch", desc: "Most first aid orders dispatched same day when ordered before 2 PM ET." },
      { icon: Award, title: "Trusted Brands", desc: "Band-Aid, Neosporin, 3M, and other industry-leading first aid brands." },
    ],
    trustText: "All first aid products meet FDA quality standards for consumer use.",
    faqs: [
      { q: "What brands of first aid supplies do you carry?", a: "We carry trusted brands including Band-Aid, Neosporin, 3M, and other industry-leading first aid manufacturers." },
      { q: "Do you sell pre-assembled first aid kits?", a: "Yes, we offer both pre-assembled kits for home, car, and travel, as well as individual supplies to build your own kit." },
      { q: "Are your first aid products hospital-grade?", a: "Many of our products are the same quality used in hospitals and clinics, made available for home and personal use." },
      { q: "How long do first aid supplies last?", a: "Most supplies have a shelf life of 3-5 years. Check expiration dates on individual products — we always ship with maximum remaining shelf life." },
    ],
    useCaseFilters: ["Bandages", "Antiseptics", "Wound Care", "Kits", "Burns", "Emergency"],
  },
  "medical-devices": {
    headline: "Medical Devices & Monitors",
    subtext:
      "FDA-cleared medical devices — blood pressure monitors, thermometers, pulse oximeters, and diagnostic tools.",
    heroBg: "bg-[#010128]",
    heroText: "text-white",
    heroAccent: "text-[#7371FC]",
    badgeBg: "bg-[#A594F9]",
    sectionBg: "bg-[#F5EFFF]",
    benefitIconBg: "bg-cyan-500/10",
    benefitIconColor: "text-cyan-600",
    icon: Stethoscope,
    iconName: "Stethoscope",
    benefits: [
      { icon: ShieldCheck, title: "FDA-Cleared", desc: "Every device we carry is FDA-cleared for consumer and clinical use." },
      { icon: Award, title: "Clinically Validated", desc: "Devices tested against clinical standards for accuracy and reliability." },
      { icon: Syringe, title: "Professional Grade", desc: "The same brands and models trusted by healthcare professionals." },
      { icon: Truck, title: "Warranty Included", desc: "Manufacturer warranty included on all medical devices." },
    ],
    trustText: "All medical devices are FDA-cleared and come with manufacturer warranty.",
    faqs: [
      { q: "Are your medical devices FDA-cleared?", a: "Yes, every medical device we carry is FDA-cleared for consumer and/or clinical use." },
      { q: "Do medical devices come with a warranty?", a: "All devices include the manufacturer's warranty. Warranty duration varies by product — check individual product pages." },
      { q: "Can I use these devices at home?", a: "Yes, all devices we sell are designed for consumer use. Many are the same models used by healthcare professionals." },
      { q: "How accurate are your diagnostic devices?", a: "All devices are clinically validated and tested against established standards for accuracy and reliability." },
    ],
    useCaseFilters: ["Blood Pressure", "Thermometers", "Pulse Oximeters", "Glucose", "Diagnostic"],
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  headline: "Products",
  subtext: "Browse our selection of quality health products.",
  heroBg: "bg-[#010128]",
  heroText: "text-white",
  heroAccent: "text-[#A594F9]",
  badgeBg: "bg-[#7371FC]",
  sectionBg: "bg-[#F5EFFF]",
  benefitIconBg: "bg-[#7371FC]/10",
  benefitIconColor: "text-[#7371FC]",
  icon: ShieldCheck,
  iconName: "ShieldCheck",
  benefits: [
    { icon: ShieldCheck, title: "Licensed Supplier", desc: "State-licensed and verified." },
    { icon: Truck, title: "Fast US Shipping", desc: "Free shipping on orders over $99." },
    { icon: Award, title: "Quality Assured", desc: "Every product verified for authenticity." },
    { icon: CheckCircle2, title: "Secure Ordering", desc: "Your data is safe with us." },
  ],
  trustText: "All products sourced from licensed US distributors.",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string;
  manufacturer: string | null;
  purityPercent: number | null;
  isFeatured?: boolean;
  isResearchCompound: boolean;
  requiresPrescription?: boolean;
  shortDescription: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category: { name: string; slug: string } | null;
  prices: { amount: string; priceType: string }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImageUrl: string | null;
  megaMenuImageUrl: string | null;
  iconName: string | null;
  color: string | null;
  bgColor: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
  heroBg: string | null;
  heroAccent: string | null;
  badgeBg: string | null;
  benefits: { icon: string; title: string; desc: string }[] | null;
  faqs: { q: string; a: string }[] | null;
  disclaimer: string | null;
  trustText: string | null;
}

// Icon name → component map
const ICON_MAP: Record<string, typeof FlaskConical> = {
  FlaskConical, Pill, Leaf, Heart, BriefcaseMedical, Stethoscope,
  HeartPulse, ShieldCheck, Syringe, Award, Microscope, Truck,
  CheckCircle2, ArrowRight,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch category + products
  let categories: Category[] = [];
  let products: Product[] = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      apiClient<{ data: Category[] }>("/api/products/categories"),
      apiClient<{ data: Product[] }>(`/api/products?categorySlug=${slug}&limit=50`),
    ]);
    categories = catRes.data;
    products = prodRes.data;
  } catch {
    notFound();
  }

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  // Merge DB data with hardcoded fallback config
  const fallback = CATEGORY_CONFIG[slug] ?? DEFAULT_CONFIG;
  const cfg: CategoryConfig = {
    headline: category.heroHeadline || fallback.headline,
    subtext: category.heroSubtext || fallback.subtext,
    heroBg: category.heroBg || fallback.heroBg,
    heroText: fallback.heroText,
    heroAccent: category.heroAccent || fallback.heroAccent,
    badgeBg: category.badgeBg || fallback.badgeBg,
    sectionBg: fallback.sectionBg,
    benefitIconBg: fallback.benefitIconBg,
    benefitIconColor: fallback.benefitIconColor,
    icon: (category.iconName ? ICON_MAP[category.iconName] : null) || fallback.icon,
    iconName: category.iconName || fallback.iconName,
    benefits: category.benefits && category.benefits.length > 0
      ? category.benefits.map((b) => ({
          icon: ICON_MAP[b.icon] || ShieldCheck,
          title: b.title,
          desc: b.desc,
        }))
      : fallback.benefits,
    trustText: category.trustText || fallback.trustText,
    disclaimer: category.disclaimer ?? fallback.disclaimer,
    faqs: category.faqs && category.faqs.length > 0 ? category.faqs : fallback.faqs,
    useCaseFilters: fallback.useCaseFilters,
  };
  const HeroIcon = cfg.icon;
  const needsDisclaimer = slug === "peptides";

  const content = (
    <div>
      {/* ── Hero ── */}
      <section className={`relative overflow-hidden ${cfg.heroBg} px-4 py-10 sm:py-16 lg:py-20`}>
        {/* Background image from admin */}
        {category.heroImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[#010128]/65" />
          </>
        )}
        <div className="relative mx-auto max-w-7xl">
          <nav className="mb-6 flex items-center gap-1.5 text-xs text-white/50">
            <Link href="/" className="transition hover:text-white/80">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition hover:text-white/80">Products</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">{category.name}</span>
          </nav>

          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${cfg.badgeBg}/20`}>
              <HeroIcon className={`h-5 w-5 sm:h-7 sm:w-7 ${cfg.heroAccent}`} />
            </div>
            <div>
              <h1 className={`text-xl font-bold sm:text-3xl lg:text-4xl ${cfg.heroText}`}>
                {cfg.headline}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/60 sm:mt-2 sm:text-sm">
                {cfg.subtext}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Badge className={`${cfg.badgeBg} text-white`}>
              {products.length} Product{products.length !== 1 ? "s" : ""}
            </Badge>
            <Badge className="bg-white/10 text-white">Free Shipping Over $99</Badge>
            <Badge className="bg-white/10 text-white">Licensed US Supplier</Badge>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className={`${cfg.sectionBg} px-4 py-12`}>
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-xl font-bold text-[#010128]">
            Why Choose Our {category.name}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cfg.benefits.map((b) => {
              const BIcon = b.icon;
              return (
                <Card key={b.title} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.benefitIconBg}`}>
                      <BIcon className={`h-5 w-5 ${cfg.benefitIconColor}`} />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[#010128]">{b.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Products Grid ── */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            <h2 className="text-lg font-bold text-[#010128] sm:text-2xl">
              {category.name}
            </h2>
            <Link href={`/products?categorySlug=${slug}`}>
              <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <CategoryProductGrid
            products={products}
            useCaseFilters={cfg.useCaseFilters}
            iconName={cfg.iconName}
          />

          {products.length > 12 && (
            <div className="mt-8 text-center">
              <Link href={`/products?categorySlug=${slug}`}>
                <Button size="lg" className="bg-[#7371FC] text-white hover:bg-[#7371FC]/90">
                  View All {products.length} Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      {cfg.faqs && cfg.faqs.length > 0 && (
        <section className="px-4 py-14 bg-white">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-xl font-bold text-[#010128] mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-8">
              Common questions about our {category.name.toLowerCase()}
            </p>
            <FAQAccordion faqs={cfg.faqs} />
          </div>
        </section>
      )}

      {/* ── Customer Reviews ── */}
      <section className="bg-secondary/30 px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-xl font-bold text-[#010128]">
            What Customers Say
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Reviews from verified buyers of our {category.name.toLowerCase()}
          </p>
          <div className="mt-8">
            <CategoryReviews categorySlug={slug} />
          </div>
        </div>
      </section>

      {/* ── Trust / CTA ── */}
      <section className="bg-[#010128] px-4 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-[#A594F9]" />
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            {cfg.trustText}
          </p>
          <div className="mt-6">
            <Link href={`/products?categorySlug=${slug}`}>
              <Button size="lg" className="bg-[#7371FC] text-white hover:bg-[#7371FC]/90">
                Browse {category.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {cfg.disclaimer && (
            <p className="mt-6 text-xs text-white/40">{cfg.disclaimer}</p>
          )}
        </div>
      </section>
    </div>
  );

  if (needsDisclaimer) {
    return <ResearchDisclaimerGate>{content}</ResearchDisclaimerGate>;
  }

  return content;
}
