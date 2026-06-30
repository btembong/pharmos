"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Save } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const SEVERITIES = ["minor", "moderate", "major", "contraindicated"] as const;

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-blue-100 text-blue-800",
  moderate: "bg-yellow-100 text-yellow-800",
  major: "bg-orange-100 text-orange-800",
  contraindicated: "bg-red-100 text-red-800",
};

interface Interaction {
  id: string;
  drugA: string;
  drugB: string;
  severity: string;
  description: string;
  recommendation: string | null;
  source: string | null;
}

export default function InteractionsPage() {
  const { getToken } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    drugA: "", drugB: "", severity: "moderate" as string,
    description: "", recommendation: "", source: "",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchInteractions = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/interactions/all?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setInteractions(data.data);
    } catch {
      toast.error("Failed to load interactions");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  function resetForm() {
    setForm({ drugA: "", drugB: "", severity: "moderate", description: "", recommendation: "", source: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(ix: Interaction) {
    setForm({
      drugA: ix.drugA, drugB: ix.drugB, severity: ix.severity,
      description: ix.description, recommendation: ix.recommendation || "", source: ix.source || "",
    });
    setEditingId(ix.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.drugA || !form.drugB || !form.description) {
      toast.error("Drug A, Drug B, and description are required");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const url = editingId
        ? `${API_URL}/api/products/interactions/${editingId}`
        : `${API_URL}/api/products/interactions/create`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(editingId ? "Interaction updated" : "Interaction created");
      resetForm();
      fetchInteractions();
    } catch {
      toast.error("Failed to save interaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/products/interactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setInteractions((prev) => prev.filter((i) => i.id !== id));
      toast.success("Interaction deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const filtered = search
    ? interactions.filter((i) =>
        i.drugA.toLowerCase().includes(search.toLowerCase()) ||
        i.drugB.toLowerCase().includes(search.toLowerCase())
      )
    : interactions;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Drug Interactions</h1>
          <p className="text-sm text-muted-foreground">
            Manage known drug-drug interaction pairs for safety checks
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Interaction
        </Button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editingId ? "Edit" : "New"} Interaction</h3>
              <button onClick={resetForm}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Drug A (generic name)</label>
                <Input value={form.drugA} onChange={(e) => setForm({ ...form, drugA: e.target.value })} placeholder="e.g. ibuprofen" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Drug B (generic name)</label>
                <Input value={form.drugB} onChange={(e) => setForm({ ...form, drugB: e.target.value })} placeholder="e.g. warfarin" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the interaction and risk..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Recommendation (optional)</label>
                <Input value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} placeholder="e.g. Avoid concurrent use" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Source (optional)</label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. FDA, DrugBank" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by drug name..."
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} interactions</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Drug A</th>
              <th className="px-4 py-2.5 text-left font-medium">Drug B</th>
              <th className="px-4 py-2.5 text-left font-medium">Severity</th>
              <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">Description</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((ix) => (
              <tr key={ix.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{ix.drugA}</td>
                <td className="px-4 py-2.5 font-medium">{ix.drugB}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[ix.severity] || ""}`}>
                    {ix.severity}
                  </span>
                </td>
                <td className="hidden max-w-xs truncate px-4 py-2.5 text-muted-foreground md:table-cell">
                  {ix.description}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(ix)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(ix.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No interactions found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
