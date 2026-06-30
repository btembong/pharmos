"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Pill,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Trash2,
  FlaskConical,
  Upload,
  Loader2,
  Link2,
  X,
  RefreshCw,
  Star,
  Package,
  ShieldAlert,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  genericName: string | null;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  manufacturer: string | null;
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  isFeatured: boolean;
  isActive: boolean;
  tags: string[] | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category: { name: string } | null;
  prices: { amount: string; priceType: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type FilterTab = "all" | "active" | "inactive" | "featured" | "rx" | "otc";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "featured", label: "Featured" },
  { id: "rx", label: "Rx" },
  { id: "otc", label: "OTC" },
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Softgel", "Cream", "Ointment",
  "Lyophilized Powder", "Solution", "Suspension", "Device", "Bandage", "Other",
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const EMPTY_FORM = {
  name: "", slug: "", genericName: "", brandName: "", dosageForm: "",
  strength: "", packSize: "", manufacturer: "", shortDescription: "",
  description: "", price: "", imageUrl: "", requiresPrescription: false,
  isResearchCompound: false, isFeatured: false, tags: "" as string,
};

export default function AdminProductsPage() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);

  // Pairings
  const [pairingsOpen, setPairingsOpen] = useState(false);
  const [pairingsProduct, setPairingsProduct] = useState<Product | null>(null);
  const [pairings, setPairings] = useState<{ id: string; pairedProductId: string; pairedName: string; pairedSlug: string; sortOrder: number }[]>([]);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [pairResults, setPairResults] = useState<Product[]>([]);

  // ─── Data loading ────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`${API_URL}/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => loadProducts(), search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [search, loadProducts]);

  // ─── Filtering ───────────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return p.isActive;
    if (activeFilter === "inactive") return !p.isActive;
    if (activeFilter === "featured") return p.isFeatured;
    if (activeFilter === "rx") return p.requiresPrescription;
    if (activeFilter === "otc") return !p.requiresPrescription;
    return true;
  });

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const stats = {
    total: products.length,
    active: products.filter((p) => p.isActive).length,
    featured: products.filter((p) => p.isFeatured).length,
    rx: products.filter((p) => p.requiresPrescription).length,
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function getPrice(product: Product) {
    const p = product.prices?.find((p) => p.priceType === "b2c");
    return p ? `$${Number(p.amount).toFixed(2)}` : "\u2014";
  }

  function getPriceNum(product: Product) {
    const p = product.prices?.find((p) => p.priceType === "b2c");
    return p ? Number(p.amount) : 0;
  }

  function getImage(product: Product) {
    return product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? null;
  }

  // ─── Pairings ────────────────────────────────────────────────────────────────

  async function openPairings(product: Product) {
    setPairingsProduct(product);
    setPairingsOpen(true);
    setPairingsLoading(true);
    setPairSearch("");
    setPairResults([]);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/${product.id}/pairings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPairings(data.data || []);
      }
    } catch { /* */ }
    finally { setPairingsLoading(false); }
  }

  async function addPairing(pairedId: string) {
    if (!pairingsProduct) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/products/${pairingsProduct.id}/pairings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pairedProductId: pairedId, sortOrder: pairings.length }),
      });
      openPairings(pairingsProduct);
      toast.success("Pairing added");
    } catch { toast.error("Failed to add pairing"); }
  }

  async function removePairing(pairingId: string) {
    if (!pairingsProduct) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/products/${pairingsProduct.id}/pairings/${pairingId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPairings((prev) => prev.filter((p) => p.id !== pairingId));
      toast.success("Pairing removed");
    } catch { toast.error("Failed to remove pairing"); }
  }

  async function searchPairProducts(q: string) {
    setPairSearch(q);
    if (q.length < 2) { setPairResults([]); return; }
    try {
      const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(q)}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        const f = (data.data || []).filter(
          (p: Product) => p.id !== pairingsProduct?.id && !pairings.some((pair) => pair.pairedProductId === p.id)
        );
        setPairResults(f.slice(0, 5));
      }
    } catch { /* */ }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string" && !editingId) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    const price = product.prices?.find((p) => p.priceType === "b2c");
    const img = getImage(product) ?? "";
    setEditingId(product.id);
    setForm({
      name: product.name, slug: product.slug,
      genericName: product.genericName ?? "", brandName: "",
      dosageForm: product.dosageForm ?? "", strength: product.strength ?? "",
      packSize: product.packSize ?? "", manufacturer: product.manufacturer ?? "",
      shortDescription: "", description: "",
      price: price ? String(price.amount) : "", imageUrl: img,
      requiresPrescription: product.requiresPrescription,
      isResearchCompound: false, isFeatured: product.isFeatured ?? false,
      tags: (product.tags ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }
    if (!editingId && !form.price) { toast.error("Price is required for new products"); return; }
    setSubmitting(true);
    try {
      const token = await getToken();
      const url = editingId ? `${API_URL}/api/products/${editingId}` : `${API_URL}/api/products`;
      const method = editingId ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: form.name, slug: form.slug,
        genericName: form.genericName || undefined, brandName: form.brandName || undefined,
        dosageForm: form.dosageForm || undefined, strength: form.strength || undefined,
        packSize: form.packSize || undefined, manufacturer: form.manufacturer || undefined,
        shortDescription: form.shortDescription || undefined, description: form.description || undefined,
        requiresPrescription: form.requiresPrescription, isResearchCompound: form.isResearchCompound,
        isFeatured: form.isFeatured,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      if (!editingId && form.price) body.price = form.price;
      if (form.imageUrl) body.images = [{ url: form.imageUrl, alt: form.name, isPrimary: true }];

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${editingId ? "update" : "create"} product`);
      }

      if (editingId && form.price) {
        await fetch(`${API_URL}/api/products/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ productId: editingId, priceType: "b2c", currency: "USD", amount: form.price }),
        });
      }

      toast.success(editingId ? "Product updated" : "Product created");
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      loadProducts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This will soft-delete the product.`)) return;
    setDeleting(product.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/${product.id}`, {
        method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete product");
      }
      toast.success(`"${product.name}" deleted`);
      loadProducts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Products</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stats.total} products — {stats.active} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProducts(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-accent text-white hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Products", value: stats.total, icon: Package, color: "text-primary", bg: "bg-secondary" },
          { label: "Active", value: stats.active, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Featured", value: stats.featured, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Prescription", value: stats.rx, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border p-3.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-primary">{loading ? "—" : s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Filters + View toggle */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, generic name, manufacturer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <div className="flex rounded-lg border p-0.5">
            <button
              onClick={() => setView("list")}
              className={`rounded-md p-2 transition-colors ${view === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`rounded-md p-2 transition-colors ${view === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.id === "all" ? products.length
              : tab.id === "active" ? stats.active
              : tab.id === "inactive" ? products.length - stats.active
              : tab.id === "featured" ? stats.featured
              : tab.id === "rx" ? stats.rx
              : products.length - stats.rx;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "border bg-white text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeFilter === tab.id ? "bg-white/20" : "bg-muted"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="mt-4">
          <CardContent className="flex items-center justify-center p-16">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading products...</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center p-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60">
              <Pill className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              {search ? "No products match your search" : activeFilter !== "all" ? `No ${activeFilter} products` : "No products yet"}
            </p>
            {search ? (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : activeFilter !== "all" ? (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setActiveFilter("all")}>
                Show all products
              </Button>
            ) : (
              <Button size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add your first product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "list" ? (
        /* ── List View ── */
        <Card className="mt-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[350px]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Form / Strength</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow
                    key={product.id}
                    className={`group transition-colors hover:bg-secondary/40 ${deleting === product.id ? "opacity-50" : ""}`}
                  >
                    {/* Product */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getImage(product) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getImage(product)!}
                            alt={product.name}
                            className="h-11 w-11 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/40">
                            <FlaskConical className="h-4.5 w-4.5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary">
                            {product.name}
                          </p>
                          {product.genericName && (
                            <p className="truncate text-xs text-muted-foreground italic">
                              {product.genericName}
                            </p>
                          )}
                          {product.manufacturer && (
                            <p className="truncate text-[11px] text-muted-foreground/60">
                              {product.manufacturer}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {product.category?.name ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">\u2014</span>
                      )}
                    </TableCell>

                    {/* Form / Strength */}
                    <TableCell>
                      <div className="text-sm">
                        {product.dosageForm && (
                          <p className="text-xs font-medium">{product.dosageForm}</p>
                        )}
                        {product.strength && (
                          <p className="text-[11px] text-muted-foreground">{product.strength}</p>
                        )}
                        {product.packSize && (
                          <p className="text-[11px] text-muted-foreground">{product.packSize}</p>
                        )}
                        {!product.dosageForm && !product.strength && (
                          <span className="text-xs text-muted-foreground/40">\u2014</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right">
                      <span className="text-sm font-bold text-primary">{getPrice(product)}</span>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.requiresPrescription ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            <ShieldAlert className="h-2.5 w-2.5" />Rx
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            OTC
                          </span>
                        )}
                        {product.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Star className="h-2.5 w-2.5" />Featured
                          </span>
                        )}
                      </div>
                      {product.tags && product.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {product.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{product.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(product)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPairings(product)}>
                            <Link2 className="mr-2 h-3.5 w-3.5" /> Bought Together
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            render={<Link href={`/products/${product.slug}`} target="_blank" />}
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> View on Store
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(product)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* ── Grid View ── */
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => {
            const img = getImage(product);
            return (
              <Card
                key={product.id}
                className={`group relative overflow-hidden transition-shadow hover:shadow-md ${deleting === product.id ? "opacity-50" : ""}`}
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-secondary/30">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FlaskConical className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}

                  {/* Top badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {product.requiresPrescription && (
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        Rx
                      </span>
                    )}
                    {!product.isActive && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                        Inactive
                      </span>
                    )}
                    {product.isFeatured && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <Star className="h-2.5 w-2.5" /> Featured
                      </span>
                    )}
                  </div>

                  {/* Price tag */}
                  <div className="absolute bottom-2 right-2">
                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                      {getPrice(product)}
                    </span>
                  </div>
                </div>

                <CardContent className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight text-primary">
                    {product.name}
                  </p>
                  {product.genericName && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] italic text-muted-foreground">
                      {product.genericName}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {product.category?.name || "Uncategorized"}
                    </span>
                    {product.isActive ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  {(product.dosageForm || product.strength) && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {[product.dosageForm, product.strength, product.packSize].filter(Boolean).join(" \u00b7 ")}
                    </p>
                  )}
                </CardContent>

                {/* Actions overlay */}
                <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(product)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPairings(product)}>
                        <Link2 className="mr-2 h-3.5 w-3.5" /> Bought Together
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link href={`/products/${product.slug}`} target="_blank" />}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> View on Store
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(product)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ibuprofen 200mg" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug *</label>
                <Input value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} placeholder="ibuprofen-200mg" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Generic Name</label>
                <Input value={form.genericName} onChange={(e) => updateForm("genericName", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Brand Name</label>
                <Input value={form.brandName} onChange={(e) => updateForm("brandName", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Dosage Form</label>
                <select
                  value={form.dosageForm}
                  onChange={(e) => updateForm("dosageForm", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Strength</label>
                <Input value={form.strength} onChange={(e) => updateForm("strength", e.target.value)} placeholder="200mg" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pack Size</label>
                <Input value={form.packSize} onChange={(e) => updateForm("packSize", e.target.value)} placeholder="100 tablets" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Manufacturer</label>
                <Input value={form.manufacturer} onChange={(e) => updateForm("manufacturer", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Price (USD) {editingId ? "" : "*"}</label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="9.99" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Product Image</label>
              <div className="flex items-center gap-3">
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="Preview" className="h-16 w-16 rounded-lg border object-cover" />
                )}
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition hover:bg-secondary/50 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Upload Image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
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
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          throw new Error(err.error || `Upload failed (${res.status})`);
                        }
                        const { data } = await res.json();
                        updateForm("imageUrl", data.url);
                        toast.success("Image uploaded");
                      } catch (err) {
                        toast.error((err as Error).message || "Failed to upload image");
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
              <div className="mt-2">
                <Input value={form.imageUrl} onChange={(e) => updateForm("imageUrl", e.target.value)} placeholder="Or paste image URL..." className="text-xs" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Short Description</label>
              <Input value={form.shortDescription} onChange={(e) => updateForm("shortDescription", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tags</label>
              <Input
                value={form.tags}
                onChange={(e) => updateForm("tags", e.target.value)}
                placeholder="recovery, anti-aging, muscle growth"
              />
              <p className="mt-1 text-xs text-muted-foreground">Comma-separated. Used for category filters on the storefront.</p>
            </div>
            <div className="flex flex-wrap gap-4 rounded-lg border bg-secondary/20 p-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.requiresPrescription} onChange={(e) => updateForm("requiresPrescription", e.target.checked)} className="rounded" />
                Requires Prescription
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isResearchCompound} onChange={(e) => updateForm("isResearchCompound", e.target.checked)} className="rounded" />
                Research Compound
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateForm("isFeatured", e.target.checked)} className="rounded" />
                Staff Pick (Featured)
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={submitting} className="flex-1 bg-accent text-white hover:bg-accent/90">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving..." : editingId ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pairings Dialog */}
      <Dialog open={pairingsOpen} onOpenChange={setPairingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Frequently Bought Together</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure pairings for <strong>{pairingsProduct?.name}</strong>
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Add Product</label>
              <Input
                placeholder="Search products to pair..."
                value={pairSearch}
                onChange={(e) => searchPairProducts(e.target.value)}
              />
              {pairResults.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-white shadow-sm">
                  {pairResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { addPairing(p.id); setPairSearch(""); setPairResults([]); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/50"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="truncate">{p.name}</span>
                      {p.strength && <span className="shrink-0 text-xs text-muted-foreground">{p.strength}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Pairings</label>
              {pairingsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pairings.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No pairings configured yet.</p>
              ) : (
                <div className="space-y-1">
                  {pairings.map((pair) => (
                    <div key={pair.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{pair.pairedName}</p>
                        <p className="text-xs text-muted-foreground">{pair.pairedSlug}</p>
                      </div>
                      <button
                        onClick={() => removePairing(pair.id)}
                        className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
