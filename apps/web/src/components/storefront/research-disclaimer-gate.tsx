"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, FlaskConical, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "pharmos_research_consent";
const CONSENT_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hasValidConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp < CONSENT_DURATION_MS;
  } catch {
    return false;
  }
}

function saveConsent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
}

export function ResearchDisclaimerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [consented, setConsented] = useState<boolean | null>(null);
  const [checks, setChecks] = useState({
    age: false,
    researchUse: false,
    qualified: false,
    terms: false,
  });

  useEffect(() => {
    setConsented(hasValidConsent());
  }, []);

  // Still loading from localStorage
  if (consented === null) return null;

  // Already consented
  if (consented) return <>{children}</>;

  const allChecked = checks.age && checks.researchUse && checks.qualified && checks.terms;

  function handleAccept() {
    saveConsent();
    setConsented(true);
  }

  function handleDecline() {
    router.push("/");
  }

  const checkboxItems = [
    {
      key: "age" as const,
      label: "I confirm that I am at least 18 years of age.",
    },
    {
      key: "researchUse" as const,
      label:
        "I understand that these products are intended strictly for in-vitro laboratory research and are not for human or veterinary use, consumption, or injection.",
    },
    {
      key: "qualified" as const,
      label:
        "I confirm that I am a qualified researcher or am purchasing on behalf of a research institution.",
    },
    {
      key: "terms" as const,
      label:
        "I accept the Terms of Service and acknowledge that misuse of research compounds is solely my responsibility.",
    },
  ];

  return (
    <>
      {children}

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010128]/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="rounded-t-2xl bg-[#010128] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7371FC]/20">
                <FlaskConical className="h-5 w-5 text-[#A594F9]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Research Compound Acknowledgment</h2>
                <p className="text-xs text-white/50">Required before viewing this content</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">
                The products in this section are research compounds intended exclusively for
                laboratory use. Please read and confirm each statement below.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {checkboxItems.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition hover:border-[#7371FC]/30 hover:bg-[#F5EFFF]/50"
                >
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    onChange={(e) =>
                      setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#7371FC] accent-[#7371FC]"
                  />
                  <span className="text-sm leading-relaxed text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <button
              onClick={handleDecline}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Decline &amp; Return Home
            </button>
            <Button
              onClick={handleAccept}
              disabled={!allChecked}
              className="bg-[#7371FC] text-white hover:bg-[#7371FC]/90 disabled:opacity-40"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              I Acknowledge &amp; Continue
            </Button>
          </div>

          <p className="px-6 pb-4 text-center text-[10px] text-muted-foreground">
            Your acknowledgment is stored locally for 30 days.
          </p>
        </div>
      </div>
    </>
  );
}
