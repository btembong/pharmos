"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send, Loader2 } from "lucide-react";

const SUBJECTS = ["General Inquiry", "Order Support", "Product Question", "Prescription Info", "Returns & Refunds", "Other"];

export function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, supportEmail }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please email us directly at " + supportEmail);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <CheckCircle2 className="h-7 w-7 text-accent" />
        </div>
        <h3 className="text-lg font-bold text-[#010128]">Message Sent!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks, {form.name.split(" ")[0]}. We&apos;ll get back to you at <strong>{form.email}</strong> shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
          <Input placeholder="John Doe" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email <span className="text-destructive">*</span></label>
          <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Subject</label>
        <select
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
        >
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message <span className="text-destructive">*</span></label>
        <textarea
          rows={5}
          placeholder="How can we help you?"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full bg-[#7371FC] text-white hover:bg-[#7371FC]/90" disabled={submitting}>
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
      </Button>
    </form>
  );
}
