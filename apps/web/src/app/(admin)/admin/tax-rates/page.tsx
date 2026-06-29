"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const PRODUCT_TYPES = ["otc", "supplement", "device", "general", "rx"];

interface TaxRate {
  id: string;
  state: string;
  productType: string;
  rate: string;
}

export default function TaxRatesPage() {
  const { getToken } = useAuth();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState("");
  const [newState, setNewState] = useState("CA");
  const [newType, setNewType] = useState("otc");
  const [newRate, setNewRate] = useState("0.0725");
  const [adding, setAdding] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tax/rates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setRates(data.data);
    } catch {
      toast.error("Failed to load tax rates");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  async function handleAdd() {
    setAdding(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tax/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state: newState, productType: newType, rate: parseFloat(newRate) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Tax rate saved for ${newState} — ${newType}`);
      fetchRates();
    } catch {
      toast.error("Failed to save tax rate");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/tax/rates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRates((prev) => prev.filter((r) => r.id !== id));
      toast.success("Tax rate deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const filtered = filterState
    ? rates.filter((r) => r.state === filterState)
    : rates;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Tax Rates</h1>
        <p className="text-sm text-muted-foreground">
          Manage US state sales tax rates by product type
        </p>
      </div>

      {/* Add new rate */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium">State</label>
            <select
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Product Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Rate (decimal)</label>
            <Input
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="0.0725"
              className="w-28"
            />
          </div>
          <Button onClick={handleAdd} disabled={adding} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            {adding ? "Saving..." : "Add / Update"}
          </Button>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Filter by state:</label>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} rates</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">State</th>
              <th className="px-4 py-2.5 text-left font-medium">Product Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Rate</th>
              <th className="px-4 py-2.5 text-left font-medium">Percentage</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((rate) => (
              <tr key={rate.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{rate.state}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                    {rate.productType}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{rate.rate}</td>
                <td className="px-4 py-2.5">{(parseFloat(rate.rate) * 100).toFixed(2)}%</td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rate.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No tax rates found. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
