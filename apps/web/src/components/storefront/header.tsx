"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Search, Menu, FlaskConical, Package, ShoppingCart,
  Pill, Leaf, HeartPulse, BriefcaseMedical, Stethoscope,
  ChevronDown, Minus, Plus, Trash2, ShieldCheck, Syringe, Award,
  ArrowRight, X, Truck, MessageCircle, RotateCcw, ClipboardList,
  BookOpen, Star, User,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ICON_MAP: Record<string, LucideIcon> = {
  FlaskConical, Pill, Leaf, HeartPulse, BriefcaseMedical,
  Stethoscope, ShieldCheck, Syringe, Award, Heart: HeartPulse, Package,
};

const PROMO_MESSAGES = [
  "Free shipping on orders over $99",
  "US-based retailer — COA with every order",
  "Same-day dispatch on orders before 2 PM ET",
  "99%+ purity — third-party lab tested",
];

const FALLBACK_CATEGORIES = [
  { name: "Peptides", slug: "peptides", iconName: "FlaskConical", description: "Research-grade peptides with COA", color: "text-purple-600", bgColor: "bg-[#7371FC]", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
  { name: "OTC Medicines", slug: "otc", iconName: "Pill", description: "Pain relief, cold & flu, allergy", color: "text-blue-600", bgColor: "bg-blue-600", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
  { name: "Vitamins & Supplements", slug: "vitamins", iconName: "Leaf", description: "Daily vitamins, minerals & more", color: "text-green-600", bgColor: "bg-green-600", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
  { name: "First Aid", slug: "first-aid", iconName: "BriefcaseMedical", description: "Bandages, antiseptics & kits", color: "text-red-600", bgColor: "bg-red-600", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
  { name: "Medical Devices", slug: "medical-devices", iconName: "Stethoscope", description: "Monitors, thermometers & more", color: "text-indigo-600", bgColor: "bg-indigo-600", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
  { name: "Personal Care", slug: "personal-care", iconName: "HeartPulse", description: "Health & wellness essentials", color: "text-pink-600", bgColor: "bg-pink-600", megaMenuImageUrl: null as string | null, heroImageUrl: null as string | null },
];

interface MenuCategory {
  name: string;
  slug: string;
  iconName: string | null;
  description: string | null;
  color: string | null;
  bgColor: string | null;
  megaMenuImageUrl: string | null;
  heroImageUrl: string | null;
}

export function StorefrontHeader() {
  const { isSignedIn } = useUser();
  const { items, itemCount, subtotal, removeItem, updateQuantity } = useCart();

  const [promoIdx, setPromoIdx] = useState(0);
  const [categories, setCategories] = useState<MenuCategory[]>(FALLBACK_CATEGORIES);

  // Mega menu
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaHover, setMegaHover] = useState(0);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search overlay
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; slug: string; strength: string | null; prices: { amount: string }[]; images: { url: string; isPrimary: boolean }[] | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart preview
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  // Mobile search
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileResults, setMobileResults] = useState<typeof searchResults>([]);
  const [mobileLoading, setMobileLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Fetch categories
  useEffect(() => {
    fetch(`${API_URL}/api/products/categories`)
      .then((r) => r.json())
      .then((d) => { if (d.data?.length > 0) setCategories(d.data); })
      .catch(() => {});
  }, [API_URL]);

  // Rotate promo bar
  useEffect(() => {
    const t = setInterval(() => setPromoIdx((i) => (i + 1) % PROMO_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Live search
  const fetchSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setSearchResults(data.data || []);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, [API_URL]);

  useEffect(() => {
    const t = setTimeout(() => fetchSearch(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery, fetchSearch]);

  // Mobile search
  useEffect(() => {
    if (mobileQuery.trim().length < 2) { setMobileResults([]); return; }
    setMobileLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(mobileQuery)}&limit=8`);
        const data = await res.json();
        setMobileResults(data.data || []);
      } catch { setMobileResults([]); }
      finally { setMobileLoading(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [mobileQuery, API_URL]);

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMegaOpen(false); setCartOpen(false); setSearchOpen(false); }
    }
    function onClick(e: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) setCartOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, []);

  function openMega() {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setMegaOpen(true);
  }
  function closeMega() {
    megaTimerRef.current = setTimeout(() => setMegaOpen(false), 120);
  }

  return (
    <>
      {/* ─── Search overlay ─────────────────────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white/95 backdrop-blur-sm animate-in fade-in duration-150">
          {/* Close */}
          <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-8">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search peptides, OTC medicines, vitamins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60 sm:text-lg"
              autoComplete="off"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
            {searchQuery.trim().length < 2 ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Popular Searches</p>
                <div className="flex flex-wrap gap-2">
                  {["BPC-157", "TB-500", "Ipamorelin", "Ibuprofen", "Vitamin D", "Omega-3"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-sm font-medium hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      {term}
                    </button>
                  ))}
                </div>
                <p className="mt-6 mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Browse Categories</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                  {categories.map((cat) => {
                    const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
                    const bgColor = cat.bgColor || "bg-[#7371FC]";
                    return (
                      <Link
                        key={cat.slug}
                        href={`/products/category/${cat.slug}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${bgColor}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {cat.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : searchLoading ? (
              <div className="flex items-center gap-3 py-8 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <p className="py-8 text-muted-foreground">No products found for &ldquo;{searchQuery}&rdquo;</p>
            ) : (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{searchResults.length} Results</p>
                <div className="divide-y">
                  {searchResults.map((product) => {
                    const img = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
                    const price = product.prices?.[0]?.amount;
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-4 py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary/30">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{product.name}</p>
                          {product.strength && <p className="text-sm text-muted-foreground">{product.strength}</p>}
                        </div>
                        {price && <span className="shrink-0 font-bold text-accent">${Number(price).toFixed(2)}</span>}
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href={`/products?search=${encodeURIComponent(searchQuery)}`}
                  onClick={() => setSearchOpen(false)}
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80"
                >
                  <Search className="h-4 w-4" />
                  See all results for &ldquo;{searchQuery}&rdquo;
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/90 shadow-sm backdrop-blur-md">

        {/* Promo bar */}
        <div className="bg-[#7371FC] px-4 py-1.5 text-center text-xs font-medium tracking-wide text-white overflow-hidden">
          <div key={promoIdx} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {PROMO_MESSAGES[promoIdx]}
          </div>
        </div>

        {/* ─── Main nav row ──────────────────────────────────────────────────── */}
        <div className="mx-auto flex max-w-screen-xl items-center gap-2 px-4 py-2.5 sm:px-6 sm:gap-4">

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger className="md:hidden" render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-80 flex-col overflow-y-auto p-0">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Logo.png" alt="Pharmos" className="h-9 w-auto" />
              </div>

              {/* Mobile search */}
              <div className="px-4 pt-4">
                <form action="/products" method="get" className="relative flex items-center">
                  <Search className={`absolute left-3.5 h-4 w-4 transition-colors ${mobileQuery ? "text-accent" : "text-muted-foreground/60"}`} />
                  <input
                    type="text"
                    name="search"
                    placeholder="Search products..."
                    value={mobileQuery}
                    onChange={(e) => setMobileQuery(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-16 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    autoComplete="off"
                  />
                  {mobileQuery && (
                    <button type="button" onClick={() => { setMobileQuery(""); setMobileResults([]); }} className="absolute right-14 text-muted-foreground/50 hover:bg-muted p-1 rounded-full">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Button type="submit" size="sm" className="absolute right-1.5 rounded-lg bg-accent px-3 text-xs text-white hover:bg-accent/90">Go</Button>
                </form>

                {mobileQuery.trim().length >= 2 && (
                  <div className="mt-2 overflow-hidden rounded-xl border bg-white shadow-md">
                    {mobileLoading ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-muted-foreground">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        Searching...
                      </div>
                    ) : mobileResults.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No results for &ldquo;{mobileQuery}&rdquo;</p>
                    ) : (
                      <>
                        {mobileResults.map((product) => {
                          const img = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
                          const price = product.prices?.[0]?.amount;
                          return (
                            <Link key={product.id} href={`/products/${product.slug}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary/30">
                                {img ? <img src={img} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground/30" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{product.name}</p>
                                {product.strength && <p className="text-[11px] text-muted-foreground">{product.strength}</p>}
                              </div>
                              {price && <span className="shrink-0 text-sm font-bold text-accent">${Number(price).toFixed(2)}</span>}
                            </Link>
                          );
                        })}
                        <Link href={`/products?search=${encodeURIComponent(mobileQuery)}`} className="flex items-center gap-1.5 border-t px-4 py-2.5 text-xs font-medium text-accent">
                          <Search className="h-3 w-3" />
                          All results for &ldquo;{mobileQuery}&rdquo;
                          <ArrowRight className="h-3 w-3 ml-auto" />
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cart strip */}
              <div className="mx-4 mt-3">
                <Link href="/cart" className="flex items-center justify-between rounded-xl bg-accent/8 px-4 py-3 transition-colors hover:bg-accent/12">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                      <ShoppingCart className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary">{itemCount === 0 ? "Cart is empty" : `${itemCount} item${itemCount !== 1 ? "s" : ""} in cart`}</p>
                      {itemCount > 0 && <p className="text-[11px] text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground/50" />
                </Link>
              </div>

              {/* Categories grid */}
              <div className="mt-5 flex-1 px-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Shop by Category</p>
                  <Link href="/products" className="text-[11px] font-medium text-accent">See all →</Link>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
                    const imgUrl = cat.megaMenuImageUrl || cat.heroImageUrl;
                    const bgColor = cat.bgColor || "bg-[#7371FC]";
                    return (
                      <Link key={cat.slug} href={`/products/category/${cat.slug}`} className="group relative overflow-hidden rounded-xl">
                        <div className="relative h-20">
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105" />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center ${bgColor}`}>
                              <Icon className="h-8 w-8 text-white/20" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg ${bgColor} shadow`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <p className="absolute bottom-2 left-2 right-2 truncate text-[12px] font-bold text-white">{cat.name}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Quick links */}
                <div className="mt-5 border-t pt-4">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Quick Links</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { href: "/blog", icon: BookOpen, label: "Health Blog" },
                      { href: "/reviews", icon: Star, label: "Reviews" },
                      { href: "/track", icon: Truck, label: "Track Order" },
                      { href: "/faq", icon: MessageCircle, label: "FAQ" },
                      { href: "/returns", icon: RotateCcw, label: "Returns" },
                      { href: "/account/orders", icon: ClipboardList, label: "My Orders" },
                    ].map(({ href, icon: Icon, label }) => (
                      <Link key={href} href={href} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted">
                        <Icon className="h-4 w-4 shrink-0 text-accent" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Account */}
                <div className="mt-4 border-t pt-4 pb-6">
                  {isSignedIn ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Link href="/account" className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted">
                        <User className="h-4 w-4 shrink-0 text-accent" />
                        My Account
                      </Link>
                      <Link href="/account/orders" className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted">
                        <ClipboardList className="h-4 w-4 shrink-0 text-accent" />
                        My Orders
                      </Link>
                    </div>
                  ) : (
                    <SignInButton mode="modal">
                      <Button className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent/90">
                        Sign In to Your Account
                      </Button>
                    </SignInButton>
                  )}
                </div>
              </div>

              <div className="mt-auto border-t bg-muted/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-[11px] text-muted-foreground">US-based · COA with every order</span>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="Pharmos" className="h-10 w-auto" />
          </Link>

          {/* ── Desktop nav links ─────────────────────────────────────────────── */}
          <nav className="hidden md:flex flex-1 items-center gap-0.5 px-4" ref={megaRef}>

            {/* Shop dropdown trigger */}
            <button
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
              onClick={() => setMegaOpen((o) => !o)}
              className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${megaOpen ? "bg-accent/8 text-accent" : "text-foreground hover:bg-muted hover:text-accent"}`}
            >
              Shop
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Direct nav links */}
            {[
              { href: "/blog", label: "Blog" },
              { href: "/reviews", label: "Reviews", badge: "★" },
              { href: "/about", label: "About" },
              { href: "/faq", label: "FAQ" },
            ].map(({ href, label, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
                {badge && <span className="text-amber-400 text-xs leading-none">{badge}</span>}
              </Link>
            ))}
          </nav>

          {/* ── Right actions ─────────────────────────────────────────────────── */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">

            {/* Search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </button>

            {/* Account */}
            {isSignedIn ? (
              <div className="hidden md:flex items-center">
                <UserButton />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button
                  className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Sign in"
                >
                  <User className="h-[18px] w-[18px]" />
                </button>
              </SignInButton>
            )}

            {/* Cart */}
            <div className="relative" ref={cartRef}>
              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cart"
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] h-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>

              {/* Cart dropdown */}
              {cartOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  {items.length === 0 ? (
                    <div className="py-6 text-center">
                      <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">Your cart is empty</p>
                      <Link href="/products" onClick={() => setCartOpen(false)}>
                        <Button size="sm" className="mt-3">Shop Now</Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Cart ({itemCount} item{itemCount !== 1 ? "s" : ""})
                      </p>
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {items.slice(0, 5).map((item) => (
                          <div key={item.productId} className="flex items-center gap-2.5">
                            <Link href={`/products/${item.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md border object-cover" />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary/40">
                                  <Package className="h-5 w-5 text-muted-foreground/30" />
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link href={`/products/${item.slug}`} onClick={() => setCartOpen(false)} className="block truncate text-xs font-semibold hover:text-accent">
                                {item.name}
                              </Link>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <div className="flex items-center rounded border">
                                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:bg-muted">
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                  <span className="w-5 text-center text-[10px] font-semibold">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:bg-muted">
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <span className="text-xs font-semibold text-accent">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                            <button onClick={() => removeItem(item.productId)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:bg-muted hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {items.length > 5 && (
                          <p className="text-center text-[11px] text-muted-foreground">+{items.length - 5} more item{items.length - 5 > 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Link href="/cart" onClick={() => setCartOpen(false)}>
                            <Button variant="outline" size="sm" className="w-full">View Cart</Button>
                          </Link>
                          <Link href="/checkout" onClick={() => setCartOpen(false)}>
                            <Button size="sm" className="w-full">Checkout</Button>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Shop mega menu ──────────────────────────────────────────────────── */}
        {megaOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 border-b border-border bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
          >
            <div className="mx-auto max-w-screen-xl px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Shop by Category</p>
                <Link href="/products" onClick={() => setMegaOpen(false)} className="text-xs font-medium text-accent hover:text-accent/80">
                  View all products →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                {categories.map((cat, i) => {
                  const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
                  const imgUrl = cat.megaMenuImageUrl || cat.heroImageUrl;
                  const bgColor = cat.bgColor || "bg-[#7371FC]";
                  return (
                    <Link
                      key={cat.slug}
                      href={`/products/category/${cat.slug}`}
                      onClick={() => setMegaOpen(false)}
                      onMouseEnter={() => setMegaHover(i)}
                      className={`group flex flex-col overflow-hidden rounded-xl border transition-all duration-200 ${megaHover === i ? "border-accent/30 shadow-md" : "border-transparent hover:border-border"}`}
                    >
                      <div className="relative aspect-video overflow-hidden rounded-t-xl">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center ${bgColor}`}>
                            <Icon className="h-10 w-10 text-white/30" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg ${bgColor} shadow`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className={`text-[13px] font-semibold transition-colors ${megaHover === i ? "text-accent" : "text-foreground"}`}>{cat.name}</p>
                        {cat.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{cat.description}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
