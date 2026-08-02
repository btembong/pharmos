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
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  Upload,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Banner {
  id: string;
  placement: string;
  title: string;
  highlight: string | null;
  description: string | null;
  badgeText: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  overlayOpacity: number;
  textColor: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  placement: "homepage_hero",
  title: "",
  highlight: "",
  description: "",
  badgeText: "",
  ctaLabel: "",
  ctaUrl: "",
  imageUrl: "",
  overlayOpacity: 60,
  textColor: "light" as string,
  sortOrder: 0,
  isActive: true,
};

export default function BannersPage() {
  const { getToken } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const DEFAULT_SLIDES = [
    {
      placement: "homepage_hero",
      title: "Premium Peptides &",
      highlight: "Research Compounds",
      description: "High-purity BPC-157, TB-500, Ipamorelin and more. Every batch independently verified with a Certificate of Analysis.",
      badgeText: "Research Grade - Third-Party Tested",
      ctaLabel: "Shop Peptides",
      ctaUrl: "/products/category/peptides",
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: "homepage_hero",
      title: "Trusted OTC",
      highlight: "Medicines",
      description: "Pain relief, cold & flu, allergy treatments. Licensed US supplier with same-day dispatch on orders placed before 2 PM.",
      badgeText: "OTC - Fast Nationwide Shipping",
      ctaLabel: "Shop OTC Medicines",
      ctaUrl: "/products/category/otc",
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: "homepage_hero",
      title: "Vitamins &",
      highlight: "Supplements",
      description: "Premium Vitamin D, C, Omega-3, Multivitamins and more. Sourced from trusted manufacturers and independently quality-checked.",
      badgeText: "Vitamins - Supplements - Wellness",
      ctaLabel: "Shop Vitamins",
      ctaUrl: "/products/category/vitamins",
      sortOrder: 2,
      isActive: true,
    },
    {
      placement: "homepage_hero",
      title: "First Aid &",
      highlight: "Medical Supplies",
      description: "Bandages, antiseptics, emergency kits, thermometers and BP monitors. Everything you need — ready to ship nationwide.",
      badgeText: "First Aid - Medical Devices",
      ctaLabel: "Shop First Aid",
      ctaUrl: "/products/category/first-aid",
      sortOrder: 3,
      isActive: true,
    },
  ];

  async function seedDefaults() {
    setSeeding(true);
    try {
      const headers = await authHeaders();
      for (const slide of DEFAULT_SLIDES) {
        await fetch(`${API_URL}/api/banners`, {
          method: "POST",
          headers,
          body: JSON.stringify(slide),
        });
      }
      toast.success("Default slides imported — you can now edit them");
      fetchBanners();
    } catch {
      toast.error("Failed to import defaults");
    } finally {
      setSeeding(false);
    }
  }

  async function authHeaders() {
    const token = await getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function fetchBanners() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/banners/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBanners(data.data ?? []);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: banners.length });
    setDialogOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm({
      placement: banner.placement,
      title: banner.title,
      highlight: banner.highlight || "",
      description: banner.description || "",
      badgeText: banner.badgeText || "",
      ctaLabel: banner.ctaLabel || "",
      ctaUrl: banner.ctaUrl || "",
      imageUrl: banner.imageUrl || "",
      overlayOpacity: banner.overlayOpacity ?? 60,
      textColor: banner.textColor || "light",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const body = {
        ...form,
        highlight: form.highlight || null,
        description: form.description || null,
        badgeText: form.badgeText || null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        imageUrl: form.imageUrl || null,
      };

      if (editing) {
        await fetch(`${API_URL}/api/banners/${editing.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
        toast.success("Banner updated");
      } else {
        await fetch(`${API_URL}/api/banners`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        toast.success("Banner created");
      }

      setDialogOpen(false);
      fetchBanners();
    } catch {
      toast.error("Failed to save banner");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API_URL}/api/banners/${id}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Banner deleted");
      fetchBanners();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleToggle(banner: Banner) {
    try {
      const headers = await authHeaders();
      await fetch(`${API_URL}/api/banners/${banner.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      fetchBanners();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API_URL}/api/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.data?.url) {
        setForm((f) => ({ ...f, imageUrl: data.data.url }));
        toast.success("Image uploaded");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage homepage hero slides and promotional banners
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Banner
        </Button>
      </div>

      {/* Banner cards */}
      {banners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">
              No banners yet. Create your first one or import the defaults.
            </p>
            <div className="mt-4 flex gap-3">
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create Banner
              </Button>
              <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {seeding ? "Importing..." : "Import Default Slides"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} className={`overflow-hidden ${!banner.isActive ? "opacity-60" : ""}`}>
              <div className="flex">
                {/* Image preview */}
                <div className="relative w-48 shrink-0 bg-secondary/30">
                  {banner.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[120px] items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge variant={banner.isActive ? "default" : "secondary"} className="text-[10px]">
                      {banner.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="flex flex-1 items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground">#{banner.sortOrder}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {banner.placement}
                      </Badge>
                    </div>
                    <h3 className="mt-1 font-semibold">
                      {banner.title}
                      {banner.highlight && (
                        <span className="ml-1 text-accent">{banner.highlight}</span>
                      )}
                    </h3>
                    {banner.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {banner.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      {banner.ctaLabel && <span>CTA: {banner.ctaLabel}</span>}
                      {banner.ctaUrl && <span>→ {banner.ctaUrl}</span>}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(banner)}
                      title={banner.isActive ? "Deactivate" : "Activate"}
                    >
                      {banner.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(banner)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(banner.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Banner" : "Create Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Image upload */}
            <div>
              <label className="text-sm font-medium">Banner Image</label>
              <div className="mt-1.5">
                {form.imageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="Banner preview"
                      className="h-48 w-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <label className="cursor-pointer rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium shadow hover:bg-white">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      <button
                        onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                        className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-destructive shadow hover:bg-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition hover:bg-secondary/30">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="mt-2 text-sm text-muted-foreground">
                          Click to upload banner image
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground/60">
                          Recommended: 1920x600px, JPG/PNG/WebP
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
                <div className="mt-1.5">
                  <Input
                    placeholder="Or paste image URL"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  className="mt-1"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Premium Peptides &"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Highlight Text</label>
                <Input
                  className="mt-1"
                  value={form.highlight}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, highlight: e.target.value }))
                  }
                  placeholder="Research Compounds"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Slide description text..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Badge Text</label>
              <Input
                className="mt-1"
                value={form.badgeText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, badgeText: e.target.value }))
                }
                placeholder="Research Grade - Third-Party Tested"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">CTA Button Label</label>
                <Input
                  className="mt-1"
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder="Shop Peptides"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CTA Button URL</label>
                <Input
                  className="mt-1"
                  value={form.ctaUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaUrl: e.target.value }))
                  }
                  placeholder="/products/category/peptides"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Placement</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none"
                  value={form.placement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, placement: e.target.value }))
                  }
                >
                  <option value="homepage_hero">Homepage Hero</option>
                  <option value="promo_bar">Promo Bar</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>

            {/* Overlay & Text Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Overlay Darkness — {form.overlayOpacity}%
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Higher = darker overlay over the image, better text readability
                </p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.overlayOpacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, overlayOpacity: parseInt(e.target.value) }))
                  }
                  className="mt-2 w-full accent-[#7371FC]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>0% (no overlay)</span>
                  <span>100% (full dark)</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Text Color</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Use dark text for light backgrounds with low overlay
                </p>
                <div className="mt-2 flex gap-2">
                  {[
                    { value: "light", label: "Light (white)", preview: "bg-white text-[#010128] border" },
                    { value: "dark", label: "Dark (navy)", preview: "bg-[#010128] text-white" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, textColor: opt.value }))}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${opt.preview} ${
                        form.textColor === opt.value
                          ? "ring-2 ring-[#7371FC] ring-offset-2"
                          : "opacity-60 hover:opacity-80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
