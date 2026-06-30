"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, MapPin, Pencil, Trash2, Star, Loader } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

interface Address {
  id: string;
  label: string | null;
  recipientName: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

const EMPTY_FORM = {
  label: "",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  isDefault: false,
};

export default function AccountAddressesPage() {
  const { getToken } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadAddresses() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/customers/me/addresses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.data ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      label: addr.label || "",
      recipientName: addr.recipientName || "",
      phone: addr.phone || "",
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.addressLine1 || !form.city || !form.state || !form.zipCode) {
      toast.error("Street address, city, state, and ZIP code are required");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const url = editingId
        ? `${API_URL}/api/customers/me/addresses/${editingId}`
        : `${API_URL}/api/customers/me/addresses`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label: form.label || undefined,
          recipientName: form.recipientName || undefined,
          phone: form.phone || undefined,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          isDefault: form.isDefault,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save address");
      }
      toast.success(editingId ? "Address updated" : "Address added");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadAddresses();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/customers/me/addresses/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete address");
      }
      toast.success("Address deleted");
      loadAddresses();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/customers/me/addresses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isDefault: true }),
      });
      toast.success("Default address updated");
      loadAddresses();
    } catch {
      toast.error("Failed to set default address");
    }
  }

  function updateForm(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">Addresses</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            Manage your shipping addresses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button onClick={openAdd} />}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Address
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Address" : "Add Address"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Label</label>
                  <Input
                    placeholder="Home, Work, etc."
                    value={form.label}
                    onChange={(e) => updateForm("label", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Recipient Name</label>
                  <Input
                    placeholder="Full name"
                    value={form.recipientName}
                    onChange={(e) => updateForm("recipientName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Street Address *</label>
                <Input
                  placeholder="123 Main St"
                  value={form.addressLine1}
                  onChange={(e) => updateForm("addressLine1", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Apt / Suite / Unit</label>
                <Input
                  placeholder="Apt 4B"
                  value={form.addressLine2}
                  onChange={(e) => updateForm("addressLine2", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">City *</label>
                  <Input
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => updateForm("state", e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">ZIP Code *</label>
                  <Input
                    placeholder="90210"
                    value={form.zipCode}
                    onChange={(e) => updateForm("zipCode", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => updateForm("isDefault", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="isDefault" className="text-sm">
                  Set as default address
                </label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? "Saving..." : editingId ? "Update Address" : "Add Address"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60">
            <MapPin className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-foreground">No saved addresses</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a shipping address to speed up checkout.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <Card key={addr.id} className={addr.isDefault ? "border-accent/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-accent/60" />
                    <span className="text-sm font-semibold text-foreground">
                      {addr.label || "Address"}
                    </span>
                    {addr.isDefault && (
                      <Badge variant="outline" className="text-[10px] text-accent border-accent/30">
                        <Star className="mr-0.5 h-2.5 w-2.5 fill-accent" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openEdit(addr)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(addr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 pl-6 text-sm text-muted-foreground">
                  {addr.recipientName && (
                    <p className="font-medium text-foreground">{addr.recipientName}</p>
                  )}
                  <p>{addr.addressLine1}</p>
                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                  <p>
                    {addr.city}, {addr.state} {addr.zipCode}
                  </p>
                  {addr.phone && <p>{addr.phone}</p>}
                </div>
                {!addr.isDefault && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto p-0 pl-6 text-xs text-accent"
                    onClick={() => handleSetDefault(addr.id)}
                  >
                    Set as default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
