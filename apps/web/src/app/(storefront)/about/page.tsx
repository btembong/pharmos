import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Award, Truck, HeartPulse, ArrowRight,
  FlaskConical, Users, Star, ClipboardCheck,
} from "lucide-react";

export const revalidate = 300;

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const res = await apiClient<{ data: Record<string, string> }>("/api/settings/site");
    return res.data || {};
  } catch {
    return {};
  }
}

export default async function AboutPage() {
  const s = await getSiteSettings();

  const headline = s["about_headline"] || "Your Trusted Online Pharmacy";
  const story = s["about_story"] || "Pharmos was founded with a simple belief: every American deserves fast, affordable access to quality medications and health products — without leaving their home. We built this platform to bridge the gap between licensed pharmacy expertise and the convenience of modern e-commerce.";
  const mission = s["about_mission"] || "Our mission is to make quality healthcare accessible to every American household through transparency, speed, and pharmacist-guided service.";
  const license = s["about_license"] || "";
  const pharmacist = s["about_pharmacist"] || "";
  const founded = s["about_founded"] || "Est. 2020";
  const customers = s["about_stat_customers"] || "10,000+";

  const values = [
    { icon: ShieldCheck, title: "Licensed & Verified", desc: "State-licensed pharmacy. Every product is sourced from verified US distributors and authenticated before it ships." },
    { icon: FlaskConical, title: "Quality First", desc: "We carry products with full COA documentation, HPLC purity data, and GMP certification where applicable." },
    { icon: HeartPulse, title: "Patient-Centered", desc: "Our team includes qualified pharmacists available to answer questions about products, dosing, and interactions." },
    { icon: Truck, title: "Fast US Shipping", desc: "Orders dispatched same day when placed before 2 PM ET. Free standard shipping on orders over $99." },
  ];

  const stats = [
    { icon: Users, value: customers, label: "Customers Served" },
    { icon: Star, value: "4.9/5", label: "Average Rating" },
    { icon: ClipboardCheck, value: "99%+", label: "Order Accuracy" },
    { icon: Award, value: founded, label: "In Business" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#010128] px-4 py-20 sm:py-32">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#7371FC]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#A594F9]/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7371FC]/20">
            <HeartPulse className="h-7 w-7 text-[#A594F9]" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-5xl lg:text-6xl">{headline}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">{mission}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {license && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 ring-1 ring-white/20">
                <ShieldCheck className="h-3.5 w-3.5 text-[#A594F9]" /> License: {license}
              </span>
            )}
            {pharmacist && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 ring-1 ring-white/20">
                <Award className="h-3.5 w-3.5 text-[#A594F9]" /> {pharmacist}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-white px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7371FC]/10">
                  <Icon className="h-5 w-5 text-[#7371FC]" />
                </div>
                <p className="text-2xl font-bold text-[#010128]">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[#010128] sm:text-3xl">Our Story</h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">
            {story.split("\n").filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#F5EFFF] px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-[#010128] sm:text-3xl">What We Stand For</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7371FC]/10">
                  <Icon className="h-5 w-5 text-[#7371FC]" />
                </div>
                <h3 className="mt-4 font-bold text-[#010128]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#010128] px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#A594F9]" />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to experience the difference?</h2>
          <p className="mt-3 text-white/60">Browse our full catalog of OTC medicines, supplements, peptides, and medical devices.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/products">
              <Button size="lg" className="bg-[#7371FC] text-white hover:bg-[#7371FC]/90">
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
