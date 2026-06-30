"use client";

import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Minus, Plus, Trash2, ShoppingCart, FlaskConical, Lock, Package,
  Headphones, AlertTriangle, Bookmark, BookmarkCheck, Tag, Truck,
  ChevronRight, Undo2, X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const SAVED_KEY = "pharmos_saved_for_later";
const FREE_SHIPPING_THRESHOLD = 35;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DrugInteraction {
  drugA: string;
  drugB: string;
  severity: string;
  description: string;
  recommendation: string;
}

interface SavedItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
}

// Severity styling
const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
  minor:           { bg: "bg-blue-50",   border: "border-blue-200", text: "text-blue-800",   icon: "text-blue-500",   label: "Minor" },
  moderate:        { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "text-yellow-500", label: "Moderate — Consult Pharmacist" },
  major:           { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", icon: "text-orange-500", label: "Major — Pharmacist Review Required" },
  contraindicated: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800",    icon: "text-red-500",    label: "Contraindicated — Do Not Take Together" },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { items, updateQuantity, removeItem, addItem, subtotal, itemCount } = useCart();
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<CartItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 5.99;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const estimatedTotal = subtotal + shippingFee;
  const hasContraindicated = interactions.some((i) => i.severity === "contraindicated");

  // Load saved items from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSavedItems(JSON.parse(raw));
    } catch {}
  }, []);

  // Save saved items
  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedItems));
  }, [savedItems]);

  // Check drug interactions when cart changes
  useEffect(() => {
    if (items.length < 2) {
      setInteractions([]);
      return;
    }
    const genericNames = items
      .map((i) => i.genericName || i.name)
      .filter(Boolean);

    if (genericNames.length < 2) return;

    fetch(`${API_URL}/api/products/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genericNames }),
    })
      .then((r) => r.json())
      .then((data) => setInteractions(data.data || []))
      .catch(() => setInteractions([]));
  }, [items]);

  // Remove with undo
  const handleRemove = useCallback((productId: string) => {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;

    setUndoItem(item);
    removeItem(productId);

    // Clear any existing timer
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 5000);

    toast("Item removed", {
      action: {
        label: "Undo",
        onClick: () => {
          addItem({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            price: item.price,
            image: item.image,
            strength: item.strength,
            dosageForm: item.dosageForm,
            packSize: item.packSize,
            requiresPrescription: item.requiresPrescription,
            genericName: item.genericName,
          }, item.quantity);
          setUndoItem(null);
          if (undoTimer.current) clearTimeout(undoTimer.current);
        },
      },
      duration: 5000,
    });
  }, [items, removeItem, addItem]);

  // Save for later
  function saveForLater(item: CartItem) {
    setSavedItems((prev) => {
      if (prev.find((s) => s.productId === item.productId)) return prev;
      return [...prev, {
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        price: item.price,
        image: item.image,
        strength: item.strength,
        dosageForm: item.dosageForm,
        packSize: item.packSize,
      }];
    });
    removeItem(item.productId);
    toast.success(`${item.name} saved for later`);
  }

  // Move back to cart from saved
  function moveToCart(saved: SavedItem) {
    addItem({
      productId: saved.productId,
      name: saved.name,
      slug: saved.slug,
      price: saved.price,
      image: saved.image,
      strength: saved.strength,
      dosageForm: saved.dosageForm,
      packSize: saved.packSize,
      requiresPrescription: false,
    });
    setSavedItems((prev) => prev.filter((s) => s.productId !== saved.productId));
    toast.success(`${saved.name} moved to cart`);
  }

  function removeSaved(productId: string) {
    setSavedItems((prev) => prev.filter((s) => s.productId !== productId));
  }

  // Apply promo code (placeholder)
  function handleApplyPromo() {
    if (!promoCode.trim()) return;
    // For now, just show that promo codes aren't active yet
    toast.error("Promo codes are coming soon!");
    setPromoCode("");
  }

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-secondary/60">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-primary">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our products and add items to get started.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/products">
            <Button size="lg">Shop Now</Button>
          </Link>
          <Link href="/products/category/peptides">
            <Button size="lg" variant="outline">Browse Peptides</Button>
          </Link>
        </div>
        <div className="mx-auto mt-10 grid max-w-sm grid-cols-3 gap-3 text-xs text-muted-foreground sm:max-w-none sm:gap-4">
          {[
            { icon: Package, label: `Free shipping over $${FREE_SHIPPING_THRESHOLD}` },
            { icon: Lock, label: "Secure checkout" },
            { icon: Headphones, label: "Support available" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Cart with items ──────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-primary">Shopping Cart</h1>
        <span className="text-sm text-muted-foreground">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Drug interaction warnings ── */}
      {interactions.length > 0 && (
        <div className="mt-4 space-y-2">
          {interactions.map((interaction, idx) => {
            const style = SEVERITY_STYLES[interaction.severity] || SEVERITY_STYLES.moderate;
            return (
              <div key={idx} className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${style.text}`}>
                      {style.label}
                    </p>
                    <p className={`mt-1 text-sm ${style.text}`}>
                      <span className="font-medium">{interaction.drugA}</span> + <span className="font-medium">{interaction.drugB}</span>: {interaction.description}
                    </p>
                    {interaction.recommendation && (
                      <p className={`mt-1 text-xs ${style.text} opacity-80`}>
                        {interaction.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {hasContraindicated && (
            <div className="rounded-xl border border-red-300 bg-red-100 p-3 text-center">
              <p className="text-sm font-bold text-red-800">
                Checkout is blocked due to contraindicated drug interactions. Please remove one of the conflicting items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Free shipping progress bar ── */}
      <div className="mt-4 rounded-xl border bg-muted/30 p-3">
        {shippingFee === 0 ? (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold text-accent">
              You qualify for FREE shipping!
            </p>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Add <span className="font-semibold text-foreground">${freeShippingRemaining.toFixed(2)}</span> for free shipping
              </span>
              <span className="text-muted-foreground">${FREE_SHIPPING_THRESHOLD}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
            <Link href="/products" className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              Continue shopping <ChevronRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* ── Cart items ── */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <Card key={item.productId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3 sm:gap-4">
                  {/* Image */}
                  <Link href={`/products/${item.slug}`} className="shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg border object-cover transition-opacity hover:opacity-80 sm:h-20 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary/40 sm:h-20 sm:w-20">
                        <FlaskConical className="h-6 w-6 text-muted-foreground/40 sm:h-7 sm:w-7" />
                      </div>
                    )}
                  </Link>

                  {/* Details + price */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-accent sm:line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="shrink-0 text-sm font-bold sm:text-base">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    {(item.strength || item.dosageForm || item.packSize) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[item.strength, item.dosageForm, item.packSize].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-accent">${item.price.toFixed(2)}</span> × {item.quantity}
                    </p>
                  </div>
                </div>

                {/* Bottom row: quantity stepper + actions */}
                <div className="mt-3 flex items-center justify-between border-t pt-3 sm:ml-20 sm:border-0 sm:pt-0 sm:mt-2">
                  {/* Quantity stepper */}
                  <div className="flex items-center gap-0 overflow-hidden rounded-full border" role="group" aria-label="Adjust item quantity">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveForLater(item)}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-accent"
                      title="Save for later"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length > 0 && (
            <div className="flex justify-between pt-1">
              <Link href="/products" className="text-sm text-accent hover:underline">
                ← Continue Shopping
              </Link>
            </div>
          )}

          {/* ── Saved for Later ── */}
          {savedItems.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <BookmarkCheck className="h-4 w-4 text-accent" />
                Saved for Later ({savedItems.length})
              </h2>
              <div className="space-y-2">
                {savedItems.map((saved) => (
                  <div key={saved.productId} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                    <Link href={`/products/${saved.slug}`} className="shrink-0">
                      {saved.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={saved.image} alt={saved.name} className="h-14 w-14 rounded-md border object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-secondary/40">
                          <FlaskConical className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${saved.slug}`} className="block truncate text-sm font-semibold hover:text-accent">
                        {saved.name}
                      </Link>
                      <p className="text-sm font-semibold text-accent">${saved.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => moveToCart(saved)}>
                        Move to Cart
                      </Button>
                      <button
                        onClick={() => removeSaved(saved.productId)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show saved items even when cart is empty */}
          {items.length === 0 && savedItems.length > 0 && (
            <div className="py-10 text-center">
              <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">Your cart is empty, but you have saved items below.</p>
              <Link href="/products">
                <Button className="mt-3" size="sm">Continue Shopping</Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Order summary sidebar ── */}
        {items.length > 0 && (
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-5">
                <h2 className="font-bold text-primary">Order Summary</h2>
                <Separator className="my-3" />

                {/* Item breakdown */}
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between">
                      <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                      <span className="shrink-0 font-medium text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="text-xs italic">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={shippingFee === 0 ? "font-semibold text-accent" : ""}>
                      {shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Promo code */}
                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-lg border bg-muted/20 px-2.5">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                        placeholder="Promo code"
                        className="flex-1 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim()}
                      className="text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between text-base font-bold text-primary">
                  <span>Estimated Total</span>
                  <span>${estimatedTotal.toFixed(2)}</span>
                </div>

                {/* Estimated delivery */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5 text-accent" />
                  <span>Estimated delivery: 3-7 business days</span>
                </div>

                <Link href={hasContraindicated ? "#" : "/checkout"}>
                  <Button
                    size="lg"
                    className="mt-4 w-full"
                    disabled={hasContraindicated}
                    title={hasContraindicated ? "Resolve drug interactions before checkout" : undefined}
                  >
                    {hasContraindicated ? "Resolve Interactions First" : "Proceed to Checkout"}
                  </Button>
                </Link>

                {/* Trust strip */}
                <div className="mt-4 space-y-1.5 border-t pt-4">
                  {[
                    { icon: Lock, text: "Secure, encrypted checkout" },
                    { icon: Package, text: "Ships within 48h of payment" },
                    { icon: Headphones, text: "support@pharmos.com" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
