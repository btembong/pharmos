"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentStatus = "checking" | "SUCCESSFUL" | "PENDING" | "FAILED" | "CANCELLED" | "error";

function TranZakReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("orderNumber");
  const requestId = searchParams.get("requestId");

  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!requestId) {
      setStatus("error");
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`/api/payments/tranzak/status/${requestId}`);
        const json = await res.json();
        const s = json.data?.status as string;

        if (s === "SUCCESSFUL") {
          setStatus("SUCCESSFUL");
        } else if (s === "FAILED" || s === "CANCELLED") {
          setStatus(s as PaymentStatus);
        } else if (attempts < 10) {
          setAttempts((a) => a + 1);
          setTimeout(check, 3000);
        } else {
          setStatus("PENDING");
        }
      } catch {
        setStatus("error");
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
        {status === "checking" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Clock className="h-8 w-8 animate-spin text-accent" />
            </div>
            <h1 className="text-xl font-bold text-primary">Verifying payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your payment with TranZak.</p>
          </>
        )}

        {status === "SUCCESSFUL" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-primary">Payment confirmed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your order <span className="font-mono font-bold">{orderNumber}</span> has been confirmed. You'll receive an email and SMS shortly.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={() => router.push(`/track/${orderNumber}`)}>
                <Package className="mr-2 h-4 w-4" /> Track Order
              </Button>
              <Button variant="outline" onClick={() => router.push("/products")}>
                Continue Shopping
              </Button>
            </div>
          </>
        )}

        {status === "PENDING" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-xl font-bold text-primary">Payment pending</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment is being processed. We'll send you an email once confirmed — this usually takes a few minutes.
            </p>
            <Button className="mt-6 w-full" onClick={() => router.push(`/track/${orderNumber}`)}>
              <Package className="mr-2 h-4 w-4" /> Track Order
            </Button>
          </>
        )}

        {(status === "FAILED" || status === "CANCELLED" || status === "error") && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-primary">Payment unsuccessful</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment was not completed. Your order is still saved — you can try again or pay via another method.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={() => router.back()}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push(`/track/${orderNumber}`)}>
                View Order
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TranZakReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TranZakReturnContent />
    </Suspense>
  );
}
