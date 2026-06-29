import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Truck,
  FlaskConical,
  Award,
  ClipboardList,
  TriangleAlert,
  ArrowRight,
  ShoppingCart,
  Banknote,
  PackageCheck,
  Mail,
  Clock,
  Star,
  Search,
  Phone,
  MessageCircle,
  HelpCircle,
  MapPin,
  Zap,
} from "lucide-react";

import { HeroSlider } from "@/components/storefront/hero-slider";
import { FeaturedProducts } from "@/components/storefront/featured-products";
import { BestSellers } from "@/components/storefront/best-sellers";
import { ScrollReveal } from "@/components/storefront/scroll-reveal";
import { StatsTicker } from "@/components/storefront/stats-ticker";
import { CategoryGrid } from "@/components/storefront/category-grid";
import { Testimonials } from "@/components/storefront/testimonials";
import { PromoStrip } from "@/components/storefront/promo-strip";

const trustBadges = [
  { icon: ShieldCheck, label: "Licensed Supplier", desc: "State-licensed & verified" },
  { icon: FlaskConical, label: "99% Purity", desc: "Third-party lab tested" },
  { icon: Truck, label: "Fast US Shipping", desc: "Free over $99" },
  { icon: Award, label: "COA on Every Order", desc: "Certificate of Analysis included" },
];

const howItWorks = [
  {
    number: "01",
    icon: ShoppingCart,
    title: "Browse & Add to Cart",
    desc: "Find your research compounds, review purity data and COA, then add to your cart.",
  },
  {
    number: "02",
    icon: Banknote,
    title: "Pay via Zelle or Venmo",
    desc: "Place your order and send payment via Zelle, Venmo, CashApp, or wire transfer.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Receive with COA",
    desc: "We verify payment, pack your order, and ship with a Certificate of Analysis included.",
  },
];

const whyPharmos = [
  {
    icon: FlaskConical,
    title: "Rigorous Quality Testing",
    desc: "Every batch is independently tested by a third-party lab. HPLC purity data and mass spectrometry results included with every order.",
  },
  {
    icon: ClipboardList,
    title: "Certificate of Analysis",
    desc: "Download the COA for any product directly from the product page. Full transparency on purity, molecular weight, and amino acid sequence.",
  },
  {
    icon: ShieldCheck,
    title: "Licensed & Compliant",
    desc: "Licensed US supplier. All research compounds are shipped with proper documentation and are intended for laboratory research use only.",
  },
];

export default function HomePage() {
  return (
    <div>
      <HeroSlider />

      {/* Trust Badges */}
      <section className="border-b bg-white px-4 py-5 sm:py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-11 sm:w-11 sm:rounded-xl">
                <badge.icon className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary sm:text-sm">{badge.label}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Promo Strip */}
      <PromoStrip />

      {/* Stats Ticker */}
      <StatsTicker />

      {/* Featured Products */}
      <ScrollReveal>
        <section className="bg-gradient-to-b from-secondary/60 to-secondary/30 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-3 sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-primary sm:text-2xl">Featured Products</h2>
                <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                  Research-grade compounds — independently tested
                </p>
              </div>
              <Link href="/products">
                <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm">View All</Button>
              </Link>
            </div>
            <div className="mt-5 sm:mt-8">
              <FeaturedProducts />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Subtle divider */}
      <div className="mx-auto max-w-5xl px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Best Sellers */}
      <ScrollReveal>
        <section className="px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-3 sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-primary sm:text-2xl">Best Sellers</h2>
                <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                  Our most popular products — trusted by researchers
                </p>
              </div>
              <Link href="/products">
                <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm">View All</Button>
              </Link>
            </div>
            <div className="mt-5 sm:mt-8">
              <BestSellers />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Categories — dynamic from API */}
      <ScrollReveal>
        <section className="bg-gradient-to-b from-white to-secondary/20 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-lg font-bold text-primary sm:text-2xl">Shop by Category</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                Browse our full range of products
              </p>
            </div>
            <div className="mt-6 sm:mt-10">
              <CategoryGrid />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* How It Works */}
      <ScrollReveal>
        <section className="bg-secondary/40 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-lg font-bold text-primary sm:text-2xl">How It Works</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                Simple, transparent ordering — no hidden fees
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:mt-10 sm:gap-8 md:flex-row">
              {howItWorks.map((step, i) => (
                <div key={i} className="relative flex items-start gap-4 md:flex-1 md:flex-col md:items-center md:text-center">
                  {i < howItWorks.length - 1 && (
                    <div className="absolute left-[calc(50%+2.5rem)] top-6 hidden h-px w-[calc(100%-5rem)] bg-border md:block" />
                  )}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 ring-4 ring-background sm:h-12 sm:w-12">
                    <step.icon className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {step.number}
                    </span>
                  </div>
                  <div className="md:mt-4">
                    <h3 className="text-sm font-semibold text-primary sm:text-base">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Why Pharmos */}
      <ScrollReveal>
        <section className="bg-gradient-to-br from-[#F5EFFF] via-[#F5EFFF] to-[#E8DEFF] px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-[#010128] sm:text-2xl">Why Researchers Choose Pharmos</h2>
              <p className="mt-1 text-xs text-[#010128]/50 sm:text-sm">Quality, transparency, and trust in every order</p>
            </div>
            <div className="mt-5 grid gap-3 sm:mt-8 sm:gap-5 md:grid-cols-3">
              {whyPharmos.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="group/card flex gap-3 rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:gap-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover/card:bg-accent/15 sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5 text-[#7371FC] sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#010128] sm:text-base">{item.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#010128]/60 sm:mt-1 sm:text-sm">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-7 text-center sm:mt-10">
              <Link href="/products">
                <Button size="lg" className="bg-[#7371FC] text-white shadow-lg shadow-[#7371FC]/20 hover:bg-[#7371FC]/90 hover:shadow-xl hover:shadow-[#7371FC]/25">
                  Browse Our Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Customer Testimonials */}
      <ScrollReveal>
        <section className="bg-gradient-to-b from-white to-secondary/20 px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 sm:h-11 sm:w-11">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 sm:h-5 sm:w-5" />
              </div>
              <h2 className="mt-3 text-lg font-bold text-primary sm:mt-4 sm:text-2xl">What Our Customers Say</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
                Verified reviews from real customers
              </p>
            </div>
            <div className="mt-6 sm:mt-10">
              <Testimonials />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Research disclaimer */}
      <section className="border-y border-accent/20 bg-accent/8 px-4 py-5 sm:py-6">
        <div className="mx-auto flex max-w-7xl items-start gap-3 md:items-center md:justify-center">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent md:mt-0" />
          <p className="text-xs text-primary sm:text-sm">
            <span className="font-semibold">Research Use Only.</span> All peptides and research
            compounds sold by Pharmos are intended strictly for in-vitro laboratory research. Not for
            human or veterinary use. By purchasing, you confirm you are a qualified researcher.
          </p>
        </div>
      </section>

      {/* Track Order + Support */}
      <section className="bg-gradient-to-b from-white to-secondary/10 px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Track Order Card */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/5 to-accent/10 p-5 sm:p-8">
              <div className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-full bg-accent/5 sm:block" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 sm:h-12 sm:w-12">
                  <PackageCheck className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                </div>
                <h2 className="mt-3 text-base font-bold text-primary sm:mt-4 sm:text-xl">Track Your Order</h2>
                <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
                  Enter your order number to check delivery status
                </p>
                <form action="/track" className="mt-4 sm:mt-5">
                  <div className="flex gap-2 sm:relative sm:block">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                      <input
                        type="text"
                        name="orderNumber"
                        placeholder="PH-2026-000001"
                        className="w-full rounded-xl border border-input bg-white py-3 pl-9 pr-3 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 sm:py-3.5 sm:pl-10 sm:pr-28"
                      />
                    </div>
                    <Button type="submit" className="shrink-0 rounded-xl sm:absolute sm:right-1.5 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-lg">
                      Track
                    </Button>
                  </div>
                </form>
                {/* Trust stats */}
                <div className="mt-4 flex gap-4 sm:mt-6 sm:gap-6">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Truck className="h-3.5 w-3.5 text-accent/60 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-muted-foreground sm:text-xs">Avg: <span className="font-semibold text-primary">2-3 days</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <MapPin className="h-3.5 w-3.5 text-accent/60 sm:h-4 sm:w-4" />
                    <span className="text-[10px] text-muted-foreground sm:text-xs">Ships from <span className="font-semibold text-primary">USA</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#F5EFFF] to-white p-5 sm:p-8">
              <div className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-full bg-[#7371FC]/5 sm:block" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7371FC]/10 sm:h-12 sm:w-12">
                  <HelpCircle className="h-5 w-5 text-[#7371FC] sm:h-6 sm:w-6" />
                </div>
                <h2 className="mt-3 text-base font-bold text-primary sm:mt-4 sm:text-xl">Need Help?</h2>
                <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
                  Our support team is here for you
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                  <a href="mailto:support@pharmos.com" className="flex items-center gap-2 rounded-xl border bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-9 sm:w-9">
                      <Mail className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-primary sm:text-xs">Email</p>
                      <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">support@pharmos.com</p>
                    </div>
                  </a>
                  <a href="tel:+18001234567" className="flex items-center gap-2 rounded-xl border bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-9 sm:w-9">
                      <Phone className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-primary sm:text-xs">Call Us</p>
                      <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">1-800-123-4567</p>
                    </div>
                  </a>
                  <Link href="/faq" className="flex items-center gap-2 rounded-xl border bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-9 sm:w-9">
                      <MessageCircle className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-primary sm:text-xs">FAQ</p>
                      <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">Common questions</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 rounded-xl border bg-white p-2.5 sm:gap-3 sm:p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-9 sm:w-9">
                      <Clock className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-primary sm:text-xs">Hours</p>
                      <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">Mon-Fri, 9-6 ET</p>
                    </div>
                  </div>
                </div>
                {/* Response time badge */}
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/5 px-3 py-2 sm:mt-4">
                  <Zap className="h-3 w-3 text-accent sm:h-3.5 sm:w-3.5" />
                  <span className="text-[10px] font-medium text-primary sm:text-xs">We typically reply within 2 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
