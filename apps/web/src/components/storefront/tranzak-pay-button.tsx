"use client";

import { useState } from "react";
import { Zap, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function TranZakPayButton({ orderNumber }: { orderNumber: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/tranzak/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, currencyCode: "XAF" }),
      });
      const json = await res.json();
      if (json.data?.paymentAuthUrl) {
        window.location.href = json.data.paymentAuthUrl;
      } else {
        toast.error("Could not start payment — please try again.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10">
          <CreditCard className="h-3.5 w-3.5 text-accent" />
        </div>
        <p className="text-xs font-semibold text-accent">Pay instantly with TranZak</p>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Visa / Mastercard · Mobile Money — your order is confirmed automatically once payment succeeds.
      </p>
      <Button size="sm" className="w-full" disabled={loading} onClick={handlePay}>
        <Zap className="mr-1.5 h-3.5 w-3.5 text-[#7371FC]" />
        {loading ? "Redirecting…" : "Pay with TranZak"}
      </Button>
    </div>
  );
}
