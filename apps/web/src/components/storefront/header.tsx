"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Search, Menu, FlaskConical, Package, User, ShoppingCart,
  Pill, Leaf, HeartPulse, BriefcaseMedical, Stethoscope,
  ChevronDown, Minus, Plus, Trash2, ShieldCheck, Syringe, Award,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Icon name → component map for dynamic rendering
const ICON_MAP: Record<string, LucideIcon> = {
  FlaskConical, Pill, Leaf, HeartPulse, BriefcaseMedical,
  Stethoscope, ShieldCheck, Syringe, Award, Heart: HeartPulse,
  Package,
};

// Rotating promo messages
const PROMO_MESSAGES = [
  "Free shipping on orders over $35",
  "Licensed US Pharmacy — COA with every order",
  "Same-day dispatch on orders before 2 PM ET",
  "Trusted by thousands of US customers",
];

// Fallback categories if API hasn't loaded yet
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
  const [searchQuery, setSearchQuery] = useState("");
  const [promoIdx, setPromoIdx] = useState(0);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaHover, setMegaHover] = useState(0);
  const [cartPreview, setCartPreview] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Fetch categories from API (dynamic mega menu)
  const [categories, setCategories] = useState<MenuCategory[]>(FALLBACK_CATEGORIES);
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_URL}/api/products/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Rotate promo messages
  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIdx((i) => (i + 1) % PROMO_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close mega menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setCartPreview(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white/80 shadow-sm backdrop-blur-md">
      {/* Top promo bar — rotating */}
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium tracking-wide text-primary-foreground overflow-hidden">
        <div
          key={promoIdx}
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {PROMO_MESSAGES[promoIdx]}
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            className="md:hidden"
            render={<Button variant="ghost" size="icon" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="flex w-80 flex-col overflow-y-auto p-0">
            {/* Logo + branding header */}
            <div className="flex items-center gap-3 border-b px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo.png" alt="Pharmos" className="h-10 w-auto" />
            </div>

            {/* Mobile search — prominent */}
            <div className="px-4 pt-4">
              <form
                action="/products"
                method="get"
                className="relative flex items-center"
              >
                <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search products..."
                  className="h-12 w-full rounded-xl border border-input bg-white pl-10 pr-20 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-1.5 rounded-lg bg-accent px-4 text-xs text-white hover:bg-accent/90"
                >
                  Search
                </Button>
              </form>
            </div>

            {/* Cart summary strip */}
            <div className="mx-4 mt-3">
              <Link
                href="/cart"
                className="flex items-center justify-between rounded-xl bg-accent/8 px-4 py-3 transition-colors hover:bg-accent/12"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                    <ShoppingCart className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {itemCount === 0 ? "Cart is empty" : `${itemCount} item${itemCount !== 1 ? "s" : ""} in cart`}
                    </p>
                    {itemCount > 0 && (
                      <p className="text-[11px] text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground/50" />
              </Link>
            </div>

            {/* Shop section */}
            <div className="mt-4 flex-1 px-4">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Shop</p>
              <nav className="mt-2 flex flex-col gap-0.5">
                <Link href="/products" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-muted active:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  Shop All Products
                </Link>
                {categories.map((cat) => {
                  const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
                  const bgColor = cat.bgColor || "bg-muted";
                  return (
                    <Link
                      key={cat.slug}
                      href={`/products/category/${cat.slug}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted active:bg-muted"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}/15`}>
                        <Icon className={`h-4 w-4 ${cat.color || "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-primary">{cat.name}</p>
                        {cat.description && (
                          <p className="truncate text-[11px] text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Help section */}
              <div className="mt-4 border-t pt-4">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Help</p>
                <nav className="mt-2 flex flex-col gap-0.5">
                  <Link href="/account/orders" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted active:bg-muted">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <Package className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-primary">Track Order</span>
                  </Link>
                  <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted active:bg-muted">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <Search className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-primary">FAQ</span>
                  </Link>
                </nav>
              </div>

              {/* Account section */}
              <div className="mt-4 border-t pt-4">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Account</p>
                <nav className="mt-2 flex flex-col gap-0.5">
                  {isSignedIn ? (
                    <>
                      <Link
                        href="/account"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted active:bg-muted"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-primary">My Account</span>
                      </Link>
                      <Link
                        href="/account/orders"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted active:bg-muted"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-primary">My Orders</span>
                      </Link>
                    </>
                  ) : (
                    <SignInButton mode="modal">
                      <Button className="mt-1 w-full rounded-xl bg-accent py-3 text-sm text-white hover:bg-accent/90">
                        Sign In
                      </Button>
                    </SignInButton>
                  )}
                </nav>
              </div>
            </div>

            {/* Bottom trust badge */}
            <div className="mt-auto border-t px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span className="text-[11px] text-muted-foreground">Licensed US Supplier — COA with every order</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex flex-shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="Pharmos" className="h-16 w-auto" />
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden flex-1 md:flex">
          <form
            action="/products"
            method="get"
            className="flex w-full max-w-lg items-center rounded-full border border-input bg-muted/40 pl-4 pr-1.5 transition-all focus-within:border-ring focus-within:bg-white focus-within:ring-2 focus-within:ring-ring/20"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              name="search"
              placeholder="Search peptides, supplements, medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="sm"
              className="my-1.5 rounded-full bg-accent px-4 text-white hover:bg-accent/90"
              aria-label="Search products"
            >
              Search
            </Button>
          </form>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {isSignedIn ? (
            <>
              <Link
                href="/account"
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
              <Link
                href="/account/orders"
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
              >
                <Package className="h-4 w-4" />
                Orders
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="hidden bg-accent text-white hover:bg-accent/90 md:flex"
              >
                Sign In
              </Button>
            </SignInButton>
          )}

          {/* Cart icon with preview dropdown */}
          <div className="relative" ref={cartRef}>
            <button
              onClick={() => setCartPreview(!cartPreview)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors hover:bg-muted"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>

            {/* Cart preview dropdown */}
            {cartPreview && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                {items.length === 0 ? (
                  <div className="py-6 text-center">
                    <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">Your cart is empty</p>
                    <Link href="/products" onClick={() => setCartPreview(false)}>
                      <Button size="sm" className="mt-3">Shop Now</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Cart ({itemCount} item{itemCount !== 1 ? "s" : ""})
                    </p>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {items.slice(0, 5).map((item) => (
                        <div key={item.productId} className="flex items-center gap-2.5">
                          <Link href={`/products/${item.slug}`} onClick={() => setCartPreview(false)} className="shrink-0">
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
                            <Link
                              href={`/products/${item.slug}`}
                              onClick={() => setCartPreview(false)}
                              className="block truncate text-xs font-semibold hover:text-accent"
                            >
                              {item.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex items-center gap-0 rounded border">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:bg-muted"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <span className="w-5 text-center text-[10px] font-semibold">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:bg-muted"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                              <span className="text-xs font-semibold text-accent">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="shrink-0 rounded p-1 text-muted-foreground/40 hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {items.length > 5 && (
                        <p className="text-center text-[11px] text-muted-foreground">
                          +{items.length - 5} more item{items.length - 5 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 border-t pt-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Link href="/cart" onClick={() => setCartPreview(false)}>
                          <Button variant="outline" size="sm" className="w-full">View Cart</Button>
                        </Link>
                        <Link href="/checkout" onClick={() => setCartPreview(false)}>
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

      {/* Category nav — desktop */}
      <nav ref={megaRef} className="relative hidden border-t border-border/40 bg-muted/20 md:block">
        <div className="mx-auto flex max-w-screen-xl items-center px-6">

          {/* Shop All */}
          <Link
            href="/products"
            className="flex shrink-0 items-center gap-1.5 border-r border-border/40 py-3 pr-5 mr-3 text-sm font-semibold text-foreground transition-colors hover:text-accent"
          >
            <Package className="h-3.5 w-3.5" />
            Shop All
          </Link>

          {/* Category links */}
          <div className="flex flex-1 items-center">
            {categories.map((cat, i) => {
              const Icon = ICON_MAP[cat.iconName || ""] || ShieldCheck;
              return (
                <Link
                  key={cat.slug}
                  href={`/products/category/${cat.slug}`}
                  onMouseEnter={() => { setMegaOpen(true); setMegaHover(i); }}
                  onMouseLeave={() => setMegaOpen(false)}
                  className="group relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-accent" />
                  {cat.name}
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-200 group-hover:scale-x-100" />
                </Link>
              );
            })}
          </div>

          {/* Right utility links */}
          <div className="flex shrink-0 items-center gap-0.5 border-l border-border/40 ml-3 pl-5">
            <Link
              href="/faq"
              className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
            <Link
              href="/track"
              className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Track Order
            </Link>
          </div>
        </div>

        {/* Full-width horizontal mega menu */}
        {megaOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 border-b border-border bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <div className="mx-auto max-w-screen-xl px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Browse Categories
                </p>
                <Link
                  href="/products"
                  onClick={() => setMegaOpen(false)}
                  className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
                >
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
                      {/* Image / gradient preview */}
                      <div className="relative aspect-video overflow-hidden rounded-t-xl">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={cat.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
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

                      {/* Text */}
                      <div className="p-2.5">
                        <p className={`text-[13px] font-semibold transition-colors ${megaHover === i ? "text-accent" : "text-foreground"}`}>
                          {cat.name}
                        </p>
                        {cat.description && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
