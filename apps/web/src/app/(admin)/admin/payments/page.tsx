"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Loader2 } from "lucide-react";

interface Payment {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  providerRef: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminPaymentsPage() {
  const { getToken } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/payments?limit=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const list: Payment[] = data.data || [];
          setPayments(list);
          setTotal(data.meta?.total ?? list.length);
          setTotalRevenue(
            list
              .filter((p) => p.status === "success")
              .reduce((sum, p) => sum + Number(p.amount), 0)
          );
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const methodLabel = (m: string) =>
    m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manual payment confirmations log
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Payments", value: total.toString() },
          { label: "Confirmed Revenue", value: `$${totalRevenue.toFixed(2)}` },
          { label: "Avg Payment", value: total > 0 ? `$${(totalRevenue / total).toFixed(2)}` : "—" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <DollarSign className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No payments recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confirmed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(p.amount).toFixed(2)} {p.currency}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {methodLabel(p.paymentMethod)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.providerRef ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "success" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.confirmedBy ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
