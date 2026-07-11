"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Tag } from "lucide-react";
import { useSiteSettings } from "@/lib/use-site-settings";

const STORAGE_KEY = "pharmos_promo_seen";

export function PromoPopup() {
  const { settings, loaded } = useSiteSettings();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (settings["promo_enabled"] !== "true") return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, [loaded, settings]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  async function copyCode() {
    const code = settings["promo_code"] || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  if (!visible) return null;

  const code = settings["promo_code"] || "";
  const headline = settings["promo_headline"] || "Welcome! Here's a special offer just for you";
  const subtext = settings["promo_subtext"] || `Use code ${code} at checkout.`;
  const badge = settings["promo_badge"] || "SPECIAL OFFER";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:rounded-3xl">
        {/* Top gradient banner */}
        <div className="relative bg-gradient-to-br from-[#7371FC] to-[#A594F9] px-6 pt-6 pb-8 text-center">
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white/80 transition-colors hover:bg-white/30"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/20">
            <Tag className="h-5 w-5 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/30">
            {badge}
          </div>
          <h2 className="mt-3 text-lg font-bold leading-snug text-white">{headline}</h2>
        </div>

        {/* Code box */}
        <div className="px-6 pb-6 pt-0">
          <div className="-mt-4 rounded-xl border-2 border-dashed border-[#7371FC]/30 bg-[#F5EFFF] px-4 py-3 text-center">
            <p className="mb-1 text-xs text-muted-foreground">Your promo code</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-[#7371FC]">{code || "—"}</p>
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">{subtext}</p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={copyCode}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7371FC] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#7371FC]/90 active:scale-[0.98]"
            >
              {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Code</>}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
