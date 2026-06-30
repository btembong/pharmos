"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderNumber.trim().toUpperCase();
    if (trimmed) router.push(`/track/${trimmed}`);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Package className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Track Your Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your order number to see real-time status and delivery updates.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
          <Input
            placeholder="e.g. PF-2026-000012"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="flex-1 font-mono"
          />
          <Button type="submit" disabled={!orderNumber.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">Your order number was included in your confirmation email.</p>
      </div>
    </div>
  );
}
