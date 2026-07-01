"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  CreditCard,
  TriangleAlert,
  ArrowLeft,
  ArrowRight,
  Mail,
  MapPin,
  ShoppingBag,
  Package,
  Send,
  Copy,
  Check,
  Truck,
  Zap,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "contact" | "shipping" | "review" | "confirmed";

const STEPS = [
  { id: "contact" as const, label: "Contact", icon: Mail },
  { id: "shipping" as const, label: "Shipping", icon: MapPin },
  { id: "review" as const, label: "Review", icon: ShoppingBag },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(10, "Enter a valid US phone number"),
});

const shippingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  addressLine1: z.string().min(5, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "Select a state"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code (e.g. 90210)"),
  deliveryMethod: z.enum(["standard", "express"]),
});

type ContactForm = z.infer<typeof contactSchema>;
type ShippingForm = z.infer<typeof shippingSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="mb-10 flex items-center justify-center">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                  done
                    ? "bg-accent text-white"
                    : active
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-primary" : done ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 mb-4 h-0.5 w-14 transition-colors duration-300 sm:w-20 ${
                  i < idx ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<Step>("contact");
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);
  const [claimingPaid, setClaimingPaid] = useState(false);
  const [claimedPaid, setClaimedPaid] = useState(false);
  const [initiatingTranzak, setInitiatingTranzak] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<{ id: string; label: string | null; recipientName: string | null; addressLine1: string; addressLine2: string | null; city: string; state: string; zipCode: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; method: string; label: string; details: string; instructions: string | null }[]>([]);

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      email: user?.primaryEmailAddress?.emailAddress ?? "",
      phone: user?.primaryPhoneNumber?.phoneNumber ?? "",
    },
  });

  const shippingForm = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      deliveryMethod: "standard",
    },
  });

  const deliveryMethod = shippingForm.watch("deliveryMethod");
  const selectedState = shippingForm.watch("state");
  const expressExtra = 12.99;
  const baseShippingFee = subtotal >= 99 ? 0 : 9.99;
  const shippingFee = deliveryMethod === "express" ? baseShippingFee + expressExtra : baseShippingFee;

  const [estimatedTax, setEstimatedTax] = useState(0);
  const taxFetchRef = useRef<string>("");

  useEffect(() => {
    if (!selectedState || selectedState.length !== 2 || items.length === 0) {
      setEstimatedTax(0);
      return;
    }
    const key = `${selectedState}:${items.map(i => `${i.productId}:${i.quantity}:${i.price}`).join(",")}`;
    if (taxFetchRef.current === key) return;
    taxFetchRef.current = key;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_URL}/api/tax/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: selectedState,
        items: items.map(i => ({ price: i.price, quantity: i.quantity, categorySlug: null })),
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.data?.totalTax !== undefined) setEstimatedTax(d.data.totalTax);
      })
      .catch(() => {
        // Fallback to rough estimate
        setEstimatedTax(subtotal * 0.07);
      });
  }, [selectedState, items, subtotal]);

  const total = subtotal + estimatedTax + shippingFee;

  // Fetch active payment methods from API
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_URL}/api/payments/methods`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setPaymentMethods(d.data);
      })
      .catch(() => {});
  }, []);

  // Fetch saved addresses
  useEffect(() => {
    if (!isSignedIn) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    getToken().then((token) => {
      if (!token) return;
      fetch(`${API_URL}/api/customers/me/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.data) setSavedAddresses(d.data);
        })
        .catch(() => {});
    });
  }, [isSignedIn, getToken]);

  function applySavedAddress(addr: typeof savedAddresses[0]) {
    shippingForm.setValue("addressLine1", addr.addressLine1);
    shippingForm.setValue("addressLine2", addr.addressLine2 || "");
    shippingForm.setValue("city", addr.city);
    shippingForm.setValue("state", addr.state);
    shippingForm.setValue("zipCode", addr.zipCode);
    if (addr.recipientName) {
      const parts = addr.recipientName.split(" ");
      shippingForm.setValue("firstName", parts[0] || "");
      shippingForm.setValue("lastName", parts.slice(1).join(" ") || "");
    }
  }

  // Redirect empty cart (unless already confirmed)
  if (items.length === 0 && step !== "confirmed") {
    router.push("/cart");
    return null;
  }

  // ─── Auth gate ────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60">
          <LogIn className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-primary">Sign in to checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an account to place an order. It only takes a moment.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push("/sign-in?redirect_url=/checkout")}>
            Sign In
          </Button>
          <Button variant="outline" onClick={() => router.push("/sign-up?redirect_url=/checkout")}>
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step handlers ────────────────────────────────────────────────────────

  function onContactValid() {
    setStep("shipping");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onShippingValid() {
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePlaceOrder() {
    setSubmitting(true);
    const contact = contactForm.getValues();
    const shipping = shippingForm.getValues();

    try {
      const token = await getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

      // Drug interaction check — run before placing order
      const genericNames = items
        .map((i) => i.genericName)
        .filter((n): n is string => !!n && n.trim().length > 0);
      if (genericNames.length >= 2) {
        try {
          const ixRes = await fetch(`${API_URL}/api/products/interactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ genericNames }),
          });
          if (ixRes.ok) {
            const ixData = await ixRes.json();
            const interactions: { severity: string; description: string }[] = ixData.data ?? [];
            const contraindicated = interactions.filter((i) => i.severity === "contraindicated");
            const major = interactions.filter((i) => i.severity === "major");
            if (contraindicated.length > 0) {
              toast.error("Order blocked — drug interaction detected", {
                description: contraindicated[0].description,
                duration: 8000,
              });
              setSubmitting(false);
              return;
            }
            if (major.length > 0) {
              toast.warning("Significant drug interaction detected", {
                description: `${major[0].description} — Pharmacist review may be required.`,
                duration: 6000,
              });
            }
          }
        } catch {
          // Non-critical: proceed if interaction check fails
        }
      }

      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerEmail: contact.email,
          customerPhone: contact.phone,
          deliveryMethod: shipping.deliveryMethod,
          shippingAddress: {
            firstName: shipping.firstName,
            lastName: shipping.lastName,
            addressLine1: shipping.addressLine1,
            addressLine2: shipping.addressLine2 || undefined,
            city: shipping.city,
            state: shipping.state,
            zipCode: shipping.zipCode,
            phone: contact.phone,
          },
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.name,
            productSlug: i.slug,
            quantity: i.quantity,
            unitPrice: fmt(i.price),
            totalPrice: fmt(i.price * i.quantity),
          })),
          subtotal: fmt(subtotal),
          deliveryFee: fmt(shippingFee),
          taxAmount: fmt(estimatedTax),
          totalAmount: fmt(total),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const result = await res.json();
      const num = result.data?.orderNumber ?? "PF-2026-000001";
      setOrderNumber(num);
      setConfirmedTotal(total);
      clearCart();
      setStep("confirmed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Could not place order", {
        description: (err as Error).message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMethod(key);
      setTimeout(() => setCopiedMethod(null), 2000);
    } catch {
      // clipboard not available
    }
  }

  // ─── Confirmed screen ─────────────────────────────────────────────────────

  if (step === "confirmed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Success header */}
        <div className="text-center">
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-4 ring-accent/20">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">Order Placed!</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you. Your order has been received and is awaiting payment.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-secondary/40 px-5 py-2.5">
            <Package className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Order</span>
            <span className="font-mono text-base font-bold text-primary">{orderNumber}</span>
          </div>
        </div>

        {/* Payment card */}
        <Card className="mt-8 overflow-hidden">
          <div className="border-b bg-secondary/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                <CreditCard className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="font-bold text-primary">Complete Your Payment</h2>
                <p className="text-xs text-muted-foreground">Your order ships once payment is confirmed by our team</p>
              </div>
            </div>
          </div>

          <CardContent className="space-y-5 p-6">
            {/* Amount banner */}
            <div className="flex flex-col gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs opacity-60">Amount Due</p>
                <p className="text-2xl font-bold">${confirmedTotal.toFixed(2)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs opacity-60">Include in memo</p>
                <p className="font-mono text-sm font-bold">{orderNumber}</p>
              </div>
            </div>

            {/* Payment methods — fetched from admin settings */}
            <div>
              <p className="mb-3 text-sm font-semibold text-primary">Send payment via any of these:</p>
              <div className="space-y-2">
                {(paymentMethods.length > 0
                  ? paymentMethods.map((m) => ({ key: m.id, label: m.label, handle: m.details, note: m.instructions }))
                  : [
                      { key: "zelle", label: "Zelle", handle: "payments@pharmos.com", note: "Send to email address" },
                      { key: "venmo", label: "Venmo", handle: "@Pharmos", note: "Search by username" },
                      { key: "cashapp", label: "CashApp", handle: "$Pharmos", note: "Search by $cashtag" },
                      { key: "wire", label: "Wire Transfer", handle: "Acct: 1234567890 · Routing: 021000021", note: "Bank: First National · Pharmos LLC" },
                    ]
                ).map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <CreditCard className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{m.label}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{m.handle}</p>
                        {m.note && <p className="text-xs text-muted-foreground/70">{m.note}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(m.handle, m.key)}
                      className="ml-3 flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
                    >
                      {copiedMethod === m.key ? (
                        <><Check className="h-3 w-3 text-accent" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Include your order number</strong>{" "}
                <span className="font-mono font-bold">{orderNumber}</span> in the payment memo so we can match it quickly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What happens next */}
        <Card className="mt-4">
          <CardContent className="p-6">
            <h3 className="mb-5 font-semibold text-primary">What happens next</h3>
            <div className="space-y-0">
              {[
                {
                  icon: Send,
                  label: "Send payment",
                  desc: "Use any method above and include your order number in the memo.",
                  active: true,
                },
                {
                  icon: CheckCircle2,
                  label: "We confirm your payment",
                  desc: "Our team verifies receipt — typically within a few hours during business hours.",
                  active: false,
                },
                {
                  icon: Package,
                  label: "Order dispatched",
                  desc: "We'll send you a tracking number by email and SMS once shipped.",
                  active: false,
                },
              ].map((item, i, arr) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          item.active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {i < arr.length - 1 && (
                        <div className="mt-1 h-8 w-px bg-border" />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className={`text-sm font-semibold ${item.active ? "text-accent" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* TranZak — pay by card or mobile money */}
        <Card className="mt-4 overflow-hidden border-accent/20">
          <div className="flex items-center gap-3 border-b border-accent/10 bg-accent/5 px-5 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <CreditCard className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-accent">Pay instantly with TranZak</p>
              <p className="text-xs text-muted-foreground">Visa / Mastercard · Mobile Money</p>
            </div>
          </div>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Pay securely online — no need to send manually. Your order is confirmed automatically once payment succeeds.
              </p>
            </div>
            <Button
              size="sm"
              disabled={initiatingTranzak}
              onClick={async () => {
                if (!orderNumber) return;
                setInitiatingTranzak(true);
                try {
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
                  const res = await fetch(`${API_URL}/api/payments/tranzak/initiate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderNumber }),
                  });
                  const json = await res.json();
                  if (json.data?.paymentAuthUrl) {
                    window.location.href = json.data.paymentAuthUrl;
                  } else {
                    toast.error("Could not start TranZak payment — please try again.");
                  }
                } catch {
                  toast.error("Network error — please try again.");
                } finally {
                  setInitiatingTranzak(false);
                }
              }}
            >
              {initiatingTranzak ? "Redirecting…" : <><Zap className="mr-1.5 h-3.5 w-3.5 text-[#7371FC]" /> Pay with TranZak</>}
            </Button>
          </CardContent>
        </Card>

        {/* I Have Paid */}
        <Card className="mt-4">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Already sent your payment?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Let us know so we can prioritize verification.
              </p>
            </div>
            <Button
              variant={claimedPaid ? "outline" : "default"}
              size="sm"
              disabled={claimingPaid || claimedPaid}
              onClick={async () => {
                setClaimingPaid(true);
                try {
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
                  const res = await fetch(`${API_URL}/api/orders/track/${orderNumber}/claim-paid`, { method: "POST" });
                  if (res.ok) {
                    setClaimedPaid(true);
                    toast.success("Thank you! We'll verify your payment shortly.");
                  } else {
                    toast.error("Could not mark payment — please try again.");
                  }
                } catch {
                  toast.error("Network error — please try again.");
                } finally {
                  setClaimingPaid(false);
                }
              }}
            >
              {claimedPaid ? (
                <><Check className="mr-1.5 h-3.5 w-3.5" /> Notified</>
              ) : claimingPaid ? (
                "Sending..."
              ) : (
                "I Have Paid"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/track/${orderNumber}`)}
          >
            <Package className="mr-2 h-4 w-4" />
            Track Order
          </Button>
          <Button className="flex-1" onClick={() => router.push("/products")}>
            Continue Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions? Email{" "}
          <a href="mailto:support@pharmos.com" className="text-accent hover:underline">
            support@pharmos.com
          </a>
        </p>
      </div>
    );
  }

  // ─── Checkout form ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <StepIndicator current={step} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left — form area */}
        <div className="space-y-4 lg:col-span-2">

          {/* ── Step 1: Contact ── */}
          {step === "contact" && (
            <Card>
              <div className="border-b px-6 py-4">
                <h2 className="font-bold text-primary">Contact Information</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  We'll send your order confirmation and shipping updates here
                </p>
              </div>
              <CardContent className="p-6">
                <form
                  onSubmit={contactForm.handleSubmit(onContactValid)}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      autoComplete="email"
                      {...contactForm.register("email")}
                      aria-invalid={!!contactForm.formState.errors.email}
                    />
                    <FieldError message={contactForm.formState.errors.email?.message} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                      {...contactForm.register("phone")}
                      aria-invalid={!!contactForm.formState.errors.phone}
                    />
                    <FieldError message={contactForm.formState.errors.phone?.message} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for shipping updates via SMS
                    </p>
                  </div>
                  <Button type="submit" size="lg" className="mt-2 w-full">
                    Continue to Shipping
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Shipping ── */}
          {step === "shipping" && (
            <Card>
              <div className="border-b px-6 py-4">
                <h2 className="font-bold text-primary">Shipping Address</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Where should we deliver your order?
                </p>
              </div>
              <CardContent className="p-6">
                {savedAddresses.length > 0 && (
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium">Use a saved address</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applySavedAddress(addr)}
                          className="rounded-lg border p-3 text-left text-sm transition-colors hover:border-accent hover:bg-accent/5"
                        >
                          <p className="font-medium">{addr.label || addr.recipientName || "Address"}</p>
                          <p className="text-xs text-muted-foreground">{addr.addressLine1}</p>
                          <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.zipCode}</p>
                        </button>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}
                <form
                  onSubmit={shippingForm.handleSubmit(onShippingValid)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        First Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="John"
                        autoComplete="given-name"
                        {...shippingForm.register("firstName")}
                        aria-invalid={!!shippingForm.formState.errors.firstName}
                      />
                      <FieldError message={shippingForm.formState.errors.firstName?.message} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Last Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="Doe"
                        autoComplete="family-name"
                        {...shippingForm.register("lastName")}
                        aria-invalid={!!shippingForm.formState.errors.lastName}
                      />
                      <FieldError message={shippingForm.formState.errors.lastName?.message} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Street Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="123 Main St"
                      autoComplete="address-line1"
                      {...shippingForm.register("addressLine1")}
                      aria-invalid={!!shippingForm.formState.errors.addressLine1}
                    />
                    <FieldError message={shippingForm.formState.errors.addressLine1?.message} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Apartment, Suite, Unit{" "}
                      <span className="font-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="Apt 4B"
                      autoComplete="address-line2"
                      {...shippingForm.register("addressLine2")}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        City <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="New York"
                        autoComplete="address-level2"
                        {...shippingForm.register("city")}
                        aria-invalid={!!shippingForm.formState.errors.city}
                      />
                      <FieldError message={shippingForm.formState.errors.city?.message} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        State <span className="text-destructive">*</span>
                      </label>
                      <select
                        {...shippingForm.register("state")}
                        autoComplete="address-level1"
                        aria-invalid={!!shippingForm.formState.errors.state}
                        className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20 aria-invalid:border-destructive"
                      >
                        <option value="">Select</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <FieldError message={shippingForm.formState.errors.state?.message} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        ZIP Code <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="10001"
                        autoComplete="postal-code"
                        maxLength={10}
                        {...shippingForm.register("zipCode")}
                        aria-invalid={!!shippingForm.formState.errors.zipCode}
                      />
                      <FieldError message={shippingForm.formState.errors.zipCode?.message} />
                    </div>
                  </div>

                  {/* Delivery method */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Delivery Method <span className="text-destructive">*</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          value: "standard" as const,
                          icon: Truck,
                          label: "Standard Shipping",
                          desc: "3–7 business days",
                          price: baseShippingFee === 0 ? "FREE" : `$${fmt(baseShippingFee)}`,
                          highlight: baseShippingFee === 0,
                        },
                        {
                          value: "express" as const,
                          icon: Zap,
                          label: "Express Shipping",
                          desc: "1–2 business days",
                          price: `$${fmt(baseShippingFee + expressExtra)}`,
                          highlight: false,
                        },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const selected = deliveryMethod === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                              selected
                                ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                                : "border-border hover:border-accent/40 hover:bg-muted/30"
                            }`}
                          >
                            <input
                              type="radio"
                              value={opt.value}
                              {...shippingForm.register("deliveryMethod")}
                              className="sr-only"
                            />
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                selected ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </div>
                            <span
                              className={`text-sm font-bold ${opt.highlight ? "text-accent" : ""}`}
                            >
                              {opt.price}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setStep("contact")}
                      aria-label="Back to contact"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button type="submit" size="lg" className="flex-1">
                      Continue to Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Review ── */}
          {step === "review" && (
            <Card>
              <div className="border-b px-6 py-4">
                <h2 className="font-bold text-primary">Review Your Order</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Check everything looks right before placing
                </p>
              </div>
              <CardContent className="space-y-5 p-6">
                {/* Contact summary */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Contact</span>
                    </div>
                    <button
                      onClick={() => setStep("contact")}
                      className="text-xs text-accent hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{contactForm.getValues("email")}</p>
                  <p className="text-sm text-muted-foreground">{contactForm.getValues("phone")}</p>
                </div>

                {/* Shipping summary */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">Shipping to</span>
                    </div>
                    <button
                      onClick={() => setStep("shipping")}
                      className="text-xs text-accent hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    <p>
                      {shippingForm.getValues("firstName")}{" "}
                      {shippingForm.getValues("lastName")}
                    </p>
                    <p>
                      {shippingForm.getValues("addressLine1")}
                      {shippingForm.getValues("addressLine2")
                        ? `, ${shippingForm.getValues("addressLine2")}`
                        : ""}
                    </p>
                    <p>
                      {shippingForm.getValues("city")},{" "}
                      {shippingForm.getValues("state")}{" "}
                      {shippingForm.getValues("zipCode")}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {deliveryMethod === "express" ? (
                      <Zap className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {deliveryMethod} shipping
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold">
                      Items ({items.length})
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.productId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {item.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-9 w-9 shrink-0 rounded-lg border object-cover"
                            />
                          )}
                          <span className="line-clamp-1 text-muted-foreground">
                            {item.name}{" "}
                            <span className="font-medium text-foreground">
                              ×{item.quantity}
                            </span>
                          </span>
                        </div>
                        <span className="ml-2 shrink-0 font-medium">
                          ${fmt(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Payment notice */}
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-primary">Manual Payment</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After placing your order you'll receive payment instructions for Zelle, Venmo, CashApp, or wire transfer. Your order ships once our team confirms receipt.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setStep("shipping")}
                    aria-label="Back to shipping"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    disabled={submitting}
                    onClick={handlePlaceOrder}
                  >
                    {submitting
                      ? "Placing Order…"
                      : `Place Order · $${fmt(total)}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — order summary sidebar */}
        <div>
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardContent className="p-5">
                <h2 className="font-bold text-primary">Order Summary</h2>
                <Separator className="my-3" />

                <ul className="space-y-2 text-sm">
                  {items.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-2">
                      <span className="line-clamp-2 flex-1 text-muted-foreground">
                        {item.name}{" "}
                        <span className="font-medium text-foreground">×{item.quantity}</span>
                      </span>
                      <span className="shrink-0">${fmt(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-3" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (estimated)</span>
                    <span>${fmt(estimatedTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={shippingFee === 0 ? "font-medium text-accent" : ""}>
                      {shippingFee === 0 ? "FREE" : `$${fmt(shippingFee)}`}
                    </span>
                  </div>
                  {baseShippingFee > 0 && deliveryMethod === "standard" && (
                    <p className="text-xs text-muted-foreground">
                      Add ${fmt(99 - subtotal)} more for free standard shipping
                    </p>
                  )}
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>${fmt(total)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
              <p>🔒 Secure, encrypted checkout</p>
              <p>📦 Ships within 48h of payment confirmation</p>
              <p>✉️ support@pharmos.com for help</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
