"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Check, X, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

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

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New method form
  const [showForm, setShowForm] = useState(false);
  const [newMethod, setNewMethod] = useState<MethodType>("zelle");
  const [newLabel, setNewLabel] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  async function loadMethods() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/methods`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data.data || []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  async function saveMethod() {
    if (!newLabel.trim() || !newDetails.trim()) {
      toast.error("Label and details are required");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/payments/methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          method: newMethod,
          label: newLabel.trim(),
          details: newDetails.trim(),
          instructions: newInstructions.trim() || undefined,
          isActive: true,
          sortOrder: methods.length,
        }),
      });
      if (res.ok) {
        toast.success("Payment method saved");
        setShowForm(false);
        setNewLabel("");
        setNewDetails("");
        setNewInstructions("");
        loadMethods();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save method");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure payment methods shown to customers at checkout
          </p>
        </div>
      </div>

      <Card className="mt-6">
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
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : methods.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Settings className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No payment methods configured yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                Add your first payment method
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {methods.map((m) => (
                <div key={m.id} className="flex items-start justify-between px-5 py-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.label}</span>
                      <Badge variant={m.isActive ? "default" : "secondary"} className="text-[10px]">
                        {m.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">
                        {m.method.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.details}</p>
                    {m.instructions && (
                      <p className="text-xs text-muted-foreground/70">{m.instructions}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add method form */}
          {showForm && (
            <div className="border-t bg-secondary/20 p-5">
              <p className="mb-3 font-medium">Add Payment Method</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm capitalize"
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as MethodType)}
                  >
                    {METHOD_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o.replace("_", " ")}</option>
                    ))}
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
                  <Input
                    placeholder="e.g. Include your order number in the memo"
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={saveMethod} disabled={saving} className="bg-accent text-white hover:bg-accent/90">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
