"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Check, X, Loader2, Settings, Trash2,
  MessageCircle, Tag, Phone, Info,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  method: string;
  label: string;
  details: string;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
}

const METHOD_OPTIONS = ["zelle", "venmo", "cashapp", "wire_transfer", "check", "cash"] as const;
type MethodType = typeof METHOD_OPTIONS[number];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type Tab = "payment" | "whatsapp" | "promo" | "contact" | "about";

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: "payment", label: "Payment Methods", icon: Settings },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "promo", label: "Promo Popup", icon: Tag },
  { id: "contact", label: "Contact Info", icon: Phone },
  { id: "about", label: "About", icon: Info },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("payment");

  // ── Payment methods state ──
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [savingMethod, setSavingMethod] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newMethod, setNewMethod] = useState<MethodType>("zelle");
  const [newLabel, setNewLabel] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  // ── Site settings state (all tabs) ──
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Load payment methods ──
  const loadMethods = useCallback(async () => {
    setLoadingMethods(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/methods`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoadingMethods(false); }
  }, []);

  // ── Load site settings ──
  const loadSiteSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/site`);
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data.data || {});
      }
    } catch { /* ignore */ }
    finally { setLoadingSettings(false); }
  }, []);

  useEffect(() => { loadMethods(); loadSiteSettings(); }, [loadMethods, loadSiteSettings]);

  // ── Save payment method ──
  async function saveMethod() {
    if (!newLabel.trim() || !newDetails.trim()) {
      toast.error("Label and details are required");
      return;
    }
    setSavingMethod(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/payments/methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ method: newMethod, label: newLabel.trim(), details: newDetails.trim(), instructions: newInstructions.trim() || undefined, isActive: true, sortOrder: methods.length }),
      });
      if (res.ok) {
        toast.success("Payment method saved");
        setShowForm(false);
        setNewLabel(""); setNewDetails(""); setNewInstructions("");
        loadMethods();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save method");
      }
    } catch { toast.error("Network error"); }
    finally { setSavingMethod(false); }

  // ── Delete payment method ──
  async function deleteMethod(id: string) {
    if (!confirm('Delete this payment method?')) return;
    try {
      const token = await getToken();
      const res = await fetch(API_URL + '/api/payments/methods/' + id, {
        method: 'DELETE',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      if (res.ok) {
        toast.success('Payment method deleted');
        loadMethods();
      } else {
        toast.error('Failed to delete method');
      }
    } catch { toast.error('Network error'); }
  }

  // ── Save site settings ──
  async function saveSiteSettings(keys: string[]) {
    setSavingSettings(true);
    try {
      const token = await getToken();
      const payload: Record<string, string | null> = {};
      for (const k of keys) payload[k] = siteSettings[k] ?? null;
      const res = await fetch(`${API_URL}/api/settings/site`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save settings");
    } catch { toast.error("Network error"); }
    finally { setSavingSettings(false); }
  }

  function set(key: string, value: string) {
    setSiteSettings((prev) => ({ ...prev, [key]: value }));
  }

  // ── Reusable field ──
  function Field({ label, settingKey, placeholder, type = "text", hint }: { label: string; settingKey: string; placeholder: string; type?: string; hint?: string }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
        <Input
          type={type}
          placeholder={placeholder}
          value={siteSettings[settingKey] ?? ""}
          onChange={(e) => set(settingKey, e.target.value)}
        />
        {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure payment methods, WhatsApp, promo popups, contact info, and about content</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === id ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Payment Methods tab ── */}
      {activeTab === "payment" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-accent" />
              <span className="font-semibold">Payment Methods</span>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-accent text-white hover:bg-accent/90">
              <Plus className="mr-1 h-4 w-4" /> Add Method
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMethods ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : methods.length === 0 && !showForm ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Settings className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">No payment methods configured yet.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Add your first payment method</Button>
              </div>
            ) : (
              <div className="divide-y">
                {methods.map((m) => (
                  <div key={m.id} className="flex items-start justify-between px-5 py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        <Badge variant={m.isActive ? "default" : "secondary"} className="text-[10px]">{m.isActive ? "Active" : "Inactive"}</Badge>
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">{m.method.replace("_", " ")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.details}</p>
                      {m.instructions && <p className="text-xs text-muted-foreground/70">{m.instructions}</p>}
                    </div>
                    <div className="flex gap-1"><Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMethod(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                  </div>
                ))}
              </div>
            )}
            {showForm && (
              <div className="border-t bg-secondary/20 p-5">
                <p className="mb-3 font-medium">Add Payment Method</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm capitalize" value={newMethod} onChange={(e) => setNewMethod(e.target.value as MethodType)}>
                      {METHOD_OPTIONS.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Label</label>
                    <Input placeholder="e.g. Zelle" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Details (shown to customer)</label>
                    <Input placeholder="e.g. payments@pharmos.com" value={newDetails} onChange={(e) => setNewDetails(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Instructions (optional)</label>
                    <Input placeholder="e.g. Include your order number in the memo" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={saveMethod} disabled={savingMethod} className="bg-accent text-white hover:bg-accent/90">
                    {savingMethod ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}><X className="mr-1 h-4 w-4" /> Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── WhatsApp tab ── */}
      {activeTab === "whatsapp" && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 border-b p-4">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span className="font-semibold">WhatsApp Button</span>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {loadingSettings ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-xs text-green-700">
                  A floating WhatsApp button will appear on the storefront when a phone number is configured. Leave blank to hide it.
                </div>
                <Field label="WhatsApp Number (with country code)" settingKey="whatsapp_number" placeholder="+12025551234" hint="Include country code, no spaces or dashes. e.g. +12025551234" />
                <Field label="Greeting Message" settingKey="whatsapp_greeting" placeholder="Hi Pharmos! I'd like to inquire about..." hint="Pre-filled message customers see when they open WhatsApp" />
                <Button size="sm" className="bg-accent text-white hover:bg-accent/90" disabled={savingSettings} onClick={() => saveSiteSettings(["whatsapp_number", "whatsapp_greeting"])}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save WhatsApp Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Promo Popup tab ── */}
      {activeTab === "promo" && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 border-b p-4">
            <Tag className="h-4 w-4 text-accent" />
            <span className="font-semibold">Promo Code Popup</span>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {loadingSettings ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
                  Popup appears after 5 seconds on first visit. Stored in browser so it only shows once per visitor. Set <strong>enabled</strong> to <code>true</code> to activate.
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Enabled</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={siteSettings["promo_enabled"] ?? "false"}
                    onChange={(e) => set("promo_enabled", e.target.value)}
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
                <Field label="Promo Code" settingKey="promo_code" placeholder="PHARMOS10" hint="The code customers enter at checkout" />
                <Field label="Headline" settingKey="promo_headline" placeholder="Welcome! Here's 10% off your first order" />
                <Field label="Subtext" settingKey="promo_subtext" placeholder="Use code PHARMOS10 at checkout. Valid for new customers only." />
                <Field label="Discount Label" settingKey="promo_badge" placeholder="10% OFF" hint="Short label shown on the badge, e.g. '10% OFF' or 'FREE SHIPPING'" />
                <Button size="sm" className="bg-accent text-white hover:bg-accent/90" disabled={savingSettings} onClick={() => saveSiteSettings(["promo_enabled", "promo_code", "promo_headline", "promo_subtext", "promo_badge"])}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save Promo Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Contact Info tab ── */}
      {activeTab === "contact" && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 border-b p-4">
            <Phone className="h-4 w-4 text-accent" />
            <span className="font-semibold">Contact Page Info</span>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {loadingSettings ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone Number" settingKey="contact_phone" placeholder="+1 (800) 555-0100" />
                  <Field label="Email Address" settingKey="contact_email" placeholder="support@pharmos.com" />
                  <Field label="Business Hours" settingKey="contact_hours" placeholder="Mon–Fri 9am–6pm ET" />
                  <Field label="Response Time" settingKey="contact_response" placeholder="We respond within 24 hours" />
                </div>
                <Field label="Street Address" settingKey="contact_address" placeholder="123 Health Ave, Suite 100, New York, NY 10001" />
                <Field label="Google Maps Embed URL" settingKey="contact_map_url" placeholder="https://maps.google.com/..." hint="Paste the embed URL from Google Maps > Share > Embed a map" />
                <Button size="sm" className="bg-accent text-white hover:bg-accent/90" disabled={savingSettings} onClick={() => saveSiteSettings(["contact_phone", "contact_email", "contact_hours", "contact_response", "contact_address", "contact_map_url"])}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save Contact Info
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── About tab ── */}
      {activeTab === "about" && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 border-b p-4">
            <Info className="h-4 w-4 text-accent" />
            <span className="font-semibold">About Us Content</span>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {loadingSettings ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <Field label="Headline" settingKey="about_headline" placeholder="Your Trusted Online Pharmacy" />
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Our Story</label>
                  <textarea
                    rows={4}
                    placeholder="Tell your story — who you are, why you started, what makes you different..."
                    value={siteSettings["about_story"] ?? ""}
                    onChange={(e) => set("about_story", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Mission Statement</label>
                  <textarea
                    rows={2}
                    placeholder="Our mission is to make quality healthcare accessible to every American household."
                    value={siteSettings["about_mission"] ?? ""}
                    onChange={(e) => set("about_mission", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="State License Number" settingKey="about_license" placeholder="NY-2025-1234" />
                  <Field label="Pharmacist on File" settingKey="about_pharmacist" placeholder="Dr. Jane Doe, PharmD" />
                  <Field label="Years in Business" settingKey="about_founded" placeholder="Est. 2020" />
                  <Field label="Stat: Customers Served" settingKey="about_stat_customers" placeholder="50,000+" />
                </div>
                <Button size="sm" className="bg-accent text-white hover:bg-accent/90" disabled={savingSettings} onClick={() => saveSiteSettings(["about_headline", "about_story", "about_mission", "about_license", "about_pharmacist", "about_founded", "about_stat_customers"])}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save About Content
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
