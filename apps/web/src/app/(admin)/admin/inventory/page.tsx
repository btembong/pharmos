"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Boxes, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Batch {
  id: string;
  productId: string;
  productName?: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  quantityReserved: number;
  costPrice: string;
  isQuarantined: boolean;
  location: string | null;
  createdAt: string;
}

interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
}

interface ExpiryAlert {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  daysUntilExpiry: number;
}

interface ProductOption {
  id: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminInventoryPage() {
  const { getToken } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [expiring, setExpiring] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("batches");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  // Add batch form
  const [form, setForm] = useState({
    productId: "", batchNumber: "", expiryDate: "",
    quantityReceived: "", quantityOnHand: "", costPrice: "", location: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "quantityReceived" && !prev.quantityOnHand) {
        next.quantityOnHand = value;
      }
      return next;
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "batches") {
        const res = await fetch(`${API_URL}/api/inventory/batches?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setBatches(data.data || []);
        }
      } else if (activeTab === "low-stock") {
        const res = await fetch(`${API_URL}/api/inventory/alerts/low-stock`);
        if (res.ok) {
          const data = await res.json();
          setLowStock(data.data || []);
        }
      } else if (activeTab === "expiring") {
        const res = await fetch(`${API_URL}/api/inventory/alerts/expiry`);
        if (res.ok) {
          const data = await res.json();
          setExpiring(data.data || []);
        }
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load products for dropdown when dialog opens
  useEffect(() => {
    if (!dialogOpen) return;
    fetch(`${API_URL}/api/products?limit=100`)
      .then((r) => r.json())
      .then((d) => setProductOptions((d.data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [dialogOpen]);

  async function handleCreate() {
    if (!form.productId || !form.batchNumber || !form.expiryDate || !form.quantityReceived) {
      toast.error("Product, batch number, expiry date, and quantity are required");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/inventory/batches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId: form.productId,
          batchNumber: form.batchNumber,
          expiryDate: form.expiryDate,
          quantityReceived: Number(form.quantityReceived),
          quantityOnHand: Number(form.quantityOnHand || form.quantityReceived),
          costPrice: form.costPrice || undefined,
          location: form.location || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create batch");
      }

      toast.success("Batch created");
      setDialogOpen(false);
      setForm({ productId: "", batchNumber: "", expiryDate: "", quantityReceived: "", quantityOnHand: "", costPrice: "", location: "" });
      loadData();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderLoading() {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  function renderEmpty(message: string) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Boxes className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Batch management, stock levels, and alerts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="bg-primary hover:bg-primary/90" />}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Batch
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Inventory Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => updateForm("productId", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Select a product</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Batch Number *</label>
                  <Input value={form.batchNumber} onChange={(e) => updateForm("batchNumber", e.target.value)} placeholder="BN-001" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Expiry Date *</label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => updateForm("expiryDate", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity Received *</label>
                  <Input type="number" min="0" value={form.quantityReceived} onChange={(e) => updateForm("quantityReceived", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity On Hand</label>
                  <Input type="number" min="0" value={form.quantityOnHand} onChange={(e) => updateForm("quantityOnHand", e.target.value)} placeholder="Same as received" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Cost Price (USD)</label>
                  <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => updateForm("costPrice", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Storage Location</label>
                  <Input value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="Warehouse A - Shelf 1" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Create Batch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="expiring">Expiring</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? renderLoading() : batches.length === 0 ? renderEmpty("No inventory batches found. Add your first batch to get started.") : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const available = batch.quantityOnHand - batch.quantityReserved;
                      const daysToExpiry = Math.ceil(
                        (new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                          <TableCell className="text-sm">{batch.productName || batch.productId.slice(0, 8)}</TableCell>
                          <TableCell>
                            <span className={daysToExpiry <= 90 ? "text-amber-600 font-medium" : "text-sm"}>
                              {new Date(batch.expiryDate).toLocaleDateString()}
                            </span>
                            {daysToExpiry <= 30 && (
                              <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">{batch.quantityOnHand}</TableCell>
                          <TableCell className="text-right">{batch.quantityReserved}</TableCell>
                          <TableCell className="text-right font-medium">{available}</TableCell>
                          <TableCell className="text-sm text-gray-600">{batch.location || "\u2014"}</TableCell>
                          <TableCell>
                            {batch.isQuarantined ? (
                              <Badge variant="destructive">Quarantined</Badge>
                            ) : (
                              <Badge variant="default">Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? renderLoading() : lowStock.length === 0 ? renderEmpty("No low stock alerts. All products are above reorder points.") : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Reorder Point</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((alert) => (
                      <TableRow key={alert.productId}>
                        <TableCell className="font-medium">{alert.productName}</TableCell>
                        <TableCell className="text-right">{alert.currentStock}</TableCell>
                        <TableCell className="text-right">{alert.reorderPoint}</TableCell>
                        <TableCell>
                          <Badge variant={alert.currentStock === 0 ? "destructive" : "outline"}>
                            {alert.currentStock === 0 ? "Out of Stock" : "Low"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? renderLoading() : expiring.length === 0 ? renderEmpty("No batches expiring within 90 days.") : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Qty On Hand</TableHead>
                      <TableHead>Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiring.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.productName}</TableCell>
                        <TableCell className="font-mono text-sm">{alert.batchNumber}</TableCell>
                        <TableCell>{new Date(alert.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{alert.quantityOnHand}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.daysUntilExpiry <= 30
                                ? "destructive"
                                : alert.daysUntilExpiry <= 60
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {alert.daysUntilExpiry} days
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
