"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface NewsletterSignupProps {
  source?: string;
  compact?: boolean;
}

export function NewsletterSignup({ source = "footer", compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/blog/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail("");
        toast.success("You're subscribed! Welcome aboard.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to subscribe. Try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (subscribed) {
    return (
      <div className={`flex items-center gap-3 ${compact ? "py-2" : "py-4"}`}>
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium text-green-700">You&apos;re subscribed!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" className="h-8 shrink-0 text-xs" disabled={loading}>
          {loading ? "..." : "Subscribe"}
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-8 text-center">
      <Mail className="mx-auto mb-3 h-8 w-8 text-accent" />
      <h2 className="text-xl font-bold text-primary">Stay Informed</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Get weekly health tips, medication guides, and exclusive deals from our licensed pharmacists.
        No spam, unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto mt-5 flex max-w-sm gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="shrink-0">
          {loading ? "..." : "Subscribe"}
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        Join thousands of health-conscious customers.
      </p>
    </div>
  );
}
