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
  Pencil,
  Loader2,
  Upload,
  ImageIcon,
  Plus,
  Trash2,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const ICON_OPTIONS = [
  "FlaskConical", "Pill", "Leaf", "Heart", "BriefcaseMedical",
  "Stethoscope", "HeartPulse", "ShieldCheck", "Syringe", "Award",
];

interface Benefit { icon: string; title: string; desc: string }
interface FAQ { q: string; a: string }

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  heroImageUrl: string | null;
  megaMenuImageUrl: string | null;
  iconName: string | null;
  color: string | null;
  bgColor: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
  heroBg: string | null;
  heroAccent: string | null;
  badgeBg: string | null;
  benefits: Benefit[] | null;
  faqs: FAQ[] | null;
  disclaimer: string | null;
  trustText: string | null;
  sortOrder: number | null;
}

const EMPTY_BENEFIT: Benefit = { icon: "ShieldCheck", title: "", desc: "" };
const EMPTY_FAQ: FAQ = { q: "", a: "" };

export default function CategoriesPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [tab, setTab] = useState<"general" | "hero" | "benefits" | "faqs">("general");

  // Form state
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    heroImageUrl: "",
    megaMenuImageUrl: "",
    iconName: "ShieldCheck",
    color: "text-purple-600",
    bgColor: "bg-[#7371FC]",
    heroHeadline: "",
    heroSubtext: "",
    heroBg: "bg-[#010128]",
    heroAccent: "text-[#A594F9]",
    badgeBg: "bg-[#7371FC]",
    disclaimer: "",
    trustText: "",
    sortOrder: 0,
  });
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  async function authHeaders() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_URL}/api/products/categories`);
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      heroImageUrl: "",
      megaMenuImageUrl: "",
      iconName: "ShieldCheck",
      color: "text-purple-600",
      bgColor: "bg-[#7371FC]",
      heroHeadline: "",
      heroSubtext: "",
      heroBg: "bg-[#010128]",
      heroAccent: "text-[#A594F9]",
      badgeBg: "bg-[#7371FC]",
      disclaimer: "",
      trustText: "",
      sortOrder: categories.length,
    });
    setBenefits([]);
    setFaqs([]);
    setTab("general");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      imageUrl: cat.imageUrl || "",
      heroImageUrl: cat.heroImageUrl || "",
      megaMenuImageUrl: cat.megaMenuImageUrl || "",
      iconName: cat.iconName || "ShieldCheck",
      color: cat.color || "text-purple-600",
      bgColor: cat.bgColor || "bg-[#7371FC]",
      heroHeadline: cat.heroHeadline || "",
      heroSubtext: cat.heroSubtext || "",
      heroBg: cat.heroBg || "bg-[#010128]",
      heroAccent: cat.heroAccent || "text-[#A594F9]",
      badgeBg: cat.badgeBg || "bg-[#7371FC]",
      disclaimer: cat.disclaimer || "",
      trustText: cat.trustText || "",
      sortOrder: cat.sortOrder ?? 0,
    });
    setBenefits(cat.benefits ?? []);
    setFaqs(cat.faqs ?? []);
    setTab("general");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const body = {
        ...form,
        description: form.description || null,
        heroImageUrl: form.heroImageUrl || null,
        megaMenuImageUrl: form.megaMenuImageUrl || null,
        heroHeadline: form.heroHeadline || null,
        heroSubtext: form.heroSubtext || null,
        disclaimer: form.disclaimer || null,
        trustText: form.trustText || null,
        benefits: benefits.filter((b) => b.title.trim()),
        faqs: faqs.filter((f) => f.q.trim()),
      };

      const url = editing
        ? `${API_URL}/api/products/categories/${editing.id}`
        : `${API_URL}/api/products/categories`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }

      toast.success(editing ? "Category updated" : "Category created");
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: "imageUrl" | "heroImageUrl" | "megaMenuImageUrl") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
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
        setForm((f) => ({ ...f, [field]: data.data.url }));
        toast.success("Image uploaded");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage category appearance on the mega menu and category pages
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderTree className="h-12 w-12 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">
              No categories yet. Create categories from the Products page first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="overflow-hidden">
              <div className="flex">
                {/* Image preview */}
                <div className="relative w-48 shrink-0 bg-secondary/30">
                  {cat.heroImageUrl || cat.megaMenuImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(cat.heroImageUrl || cat.megaMenuImageUrl)!}
                      alt={cat.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[100px] items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                <CardContent className="flex flex-1 items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{cat.name}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        /{cat.slug}
                      </Badge>
                      {cat.sortOrder != null && (
                        <span className="text-xs text-muted-foreground">#{cat.sortOrder}</span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {cat.heroImageUrl && <Badge variant="secondary" className="text-[10px]">Hero Image</Badge>}
                      {cat.megaMenuImageUrl && <Badge variant="secondary" className="text-[10px]">Menu Image</Badge>}
                      {cat.benefits && cat.benefits.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{cat.benefits.length} Benefits</Badge>
                      )}
                      {cat.faqs && cat.faqs.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{cat.faqs.length} FAQs</Badge>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Category: ${editing.name}` : "New Category"}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {(["general", "hero", "benefits", "faqs"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-b-2 border-[#7371FC] text-[#7371FC]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {/* ── General Tab ── */}
            {tab === "general" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Slug</label>
                    <Input className="mt-1" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-xs text-muted-foreground">Short description shown in the mega menu</p>
                  <textarea
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Research-grade peptides with COA"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Icon</label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none"
                      value={form.iconName}
                      onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value }))}
                    >
                      {ICON_OPTIONS.map((icon) => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sort Order</label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Icon Color Class</label>
                    <Input className="mt-1" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="text-purple-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Background Color Class</label>
                    <Input className="mt-1" value={form.bgColor} onChange={(e) => setForm((f) => ({ ...f, bgColor: e.target.value }))} placeholder="bg-[#7371FC]" />
                  </div>
                </div>

                {/* Mega Menu Image */}
                <div>
                  <label className="text-sm font-medium">Mega Menu Image</label>
                  <p className="text-xs text-muted-foreground">Image shown in the right panel of the mega menu dropdown</p>
                  <ImageUploadField
                    value={form.megaMenuImageUrl}
                    uploading={uploading === "megaMenuImageUrl"}
                    onChange={(url) => setForm((f) => ({ ...f, megaMenuImageUrl: url }))}
                    onUpload={(e) => handleImageUpload(e, "megaMenuImageUrl")}
                  />
                </div>
              </>
            )}

            {/* ── Hero Tab ── */}
            {tab === "hero" && (
              <>
                <div>
                  <label className="text-sm font-medium">Hero Headline</label>
                  <Input className="mt-1" value={form.heroHeadline} onChange={(e) => setForm((f) => ({ ...f, heroHeadline: e.target.value }))} placeholder="Research-Grade Peptides" />
                </div>
                <div>
                  <label className="text-sm font-medium">Hero Subtext</label>
                  <textarea
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    rows={3}
                    value={form.heroSubtext}
                    onChange={(e) => setForm((f) => ({ ...f, heroSubtext: e.target.value }))}
                    placeholder="Premium peptides for in-vitro research..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Hero Background Image</label>
                  <ImageUploadField
                    value={form.heroImageUrl}
                    uploading={uploading === "heroImageUrl"}
                    onChange={(url) => setForm((f) => ({ ...f, heroImageUrl: url }))}
                    onUpload={(e) => handleImageUpload(e, "heroImageUrl")}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Hero BG Class</label>
                    <Input className="mt-1" value={form.heroBg} onChange={(e) => setForm((f) => ({ ...f, heroBg: e.target.value }))} placeholder="bg-[#010128]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hero Accent Class</label>
                    <Input className="mt-1" value={form.heroAccent} onChange={(e) => setForm((f) => ({ ...f, heroAccent: e.target.value }))} placeholder="text-[#A594F9]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Badge BG Class</label>
                    <Input className="mt-1" value={form.badgeBg} onChange={(e) => setForm((f) => ({ ...f, badgeBg: e.target.value }))} placeholder="bg-[#7371FC]" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Trust Text</label>
                  <Input className="mt-1" value={form.trustText} onChange={(e) => setForm((f) => ({ ...f, trustText: e.target.value }))} placeholder="All peptides are sold strictly for in-vitro research use." />
                </div>
                <div>
                  <label className="text-sm font-medium">Disclaimer</label>
                  <textarea
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    rows={2}
                    value={form.disclaimer}
                    onChange={(e) => setForm((f) => ({ ...f, disclaimer: e.target.value }))}
                    placeholder="For Research Use Only..."
                  />
                </div>
              </>
            )}

            {/* ── Benefits Tab ── */}
            {tab === "benefits" && (
              <>
                <p className="text-sm text-muted-foreground">
                  These cards appear on the category page below the hero section.
                </p>
                {benefits.map((b, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border p-3">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">Icon</label>
                          <select
                            className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm outline-none"
                            value={b.icon}
                            onChange={(e) => {
                              const updated = [...benefits];
                              updated[i] = { ...b, icon: e.target.value };
                              setBenefits(updated);
                            }}
                          >
                            {ICON_OPTIONS.map((icon) => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">Title</label>
                          <Input
                            className="mt-0.5"
                            value={b.title}
                            onChange={(e) => {
                              const updated = [...benefits];
                              updated[i] = { ...b, title: e.target.value };
                              setBenefits(updated);
                            }}
                            placeholder="Benefit title"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Description</label>
                        <Input
                          className="mt-0.5"
                          value={b.desc}
                          onChange={(e) => {
                            const updated = [...benefits];
                            updated[i] = { ...b, desc: e.target.value };
                            setBenefits(updated);
                          }}
                          placeholder="Benefit description"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 self-start"
                      onClick={() => setBenefits(benefits.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setBenefits([...benefits, { ...EMPTY_BENEFIT }])}>
                  <Plus className="mr-2 h-3 w-3" /> Add Benefit
                </Button>
              </>
            )}

            {/* ── FAQs Tab ── */}
            {tab === "faqs" && (
              <>
                <p className="text-sm text-muted-foreground">
                  FAQs displayed on the category page.
                </p>
                {faqs.map((faq, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border p-3">
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-xs font-medium">Question</label>
                        <Input
                          className="mt-0.5"
                          value={faq.q}
                          onChange={(e) => {
                            const updated = [...faqs];
                            updated[i] = { ...faq, q: e.target.value };
                            setFaqs(updated);
                          }}
                          placeholder="What purity levels are your peptides?"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Answer</label>
                        <textarea
                          className="mt-0.5 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                          rows={2}
                          value={faq.a}
                          onChange={(e) => {
                            const updated = [...faqs];
                            updated[i] = { ...faq, a: e.target.value };
                            setFaqs(updated);
                          }}
                          placeholder="Answer text..."
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 self-start"
                      onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFaqs([...faqs, { ...EMPTY_FAQ }])}>
                  <Plus className="mr-2 h-3 w-3" /> Add FAQ
                </Button>
              </>
            )}

            {/* Save / Cancel */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reusable image upload field ──
function ImageUploadField({
  value,
  uploading,
  onChange,
  onUpload,
}: {
  value: string;
  uploading: boolean;
  onChange: (url: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-1.5">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-36 w-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <label className="cursor-pointer rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium shadow hover:bg-white">
              Replace
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
            <button
              onClick={() => onChange("")}
              className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-destructive shadow hover:bg-white"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 transition hover:bg-secondary/30">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="mt-1.5 text-xs text-muted-foreground">Click to upload</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      )}
      <Input
        className="mt-1.5"
        placeholder="Or paste image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
