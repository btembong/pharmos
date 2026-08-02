"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
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
import { Users, Search, Loader2 } from "lucide-react";

interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminCustomersPage() {
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  async function loadCustomers(q?: string) {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("search", q);
      const res = await fetch(`${API_URL}/api/customers?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data || []);
        setTotal(data.meta?.total ?? (data.data?.length ?? 0));
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadCustomers(search.trim() || undefined);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `${total} registered customer${total !== 1 ? "s" : ""}` : "Manage your customer base"}
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-6 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <Card className="mt-4">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No customers found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
