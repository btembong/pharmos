"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function ClaimPaidButton({ orderNumber }: { orderNumber: string }) {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image or PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setProofFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function removeFile() {
    setProofFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleClick() {
    setLoading(true);
    try {
      // If there's a proof file, upload it with the claim
      const formData = new FormData();
      formData.append("orderNumber", orderNumber);
      if (proofFile) {
        formData.append("proof", proofFile);
      }

      const res = await fetch(`${API_URL}/api/orders/track/${orderNumber}/claim-paid`, {
        method: "POST",
        body: proofFile ? formData : undefined,
        headers: proofFile ? undefined : { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setClaimed(true);
        toast.success("Thank you! We'll verify your payment shortly.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Could not mark payment — please try again.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <Check className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">Payment notification sent</p>
          <p className="text-xs text-green-600">
            We'll verify your payment and update your order shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-semibold text-primary">Already sent your payment?</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Upload a screenshot of your payment and let us know so we can prioritize verification.
      </p>

      {/* File upload area */}
      <div className="mt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {proofFile ? (
          <div className="flex items-center gap-3 rounded-lg border bg-white p-2.5">
            {/* Preview */}
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Payment proof"
                className="h-14 w-14 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{proofFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(proofFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              onClick={removeFile}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 py-3 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
          >
            <Upload className="h-4 w-4" />
            Upload payment screenshot (optional)
          </button>
        )}
      </div>

      {/* Submit button */}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          disabled={loading}
          onClick={handleClick}
        >
          {loading ? "Sending..." : "I Have Paid"}
        </Button>
      </div>
    </div>
  );
}
