"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Shield, Calendar, Pencil, Check, X, Loader } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface CustomerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  marketingConsent: boolean;
  createdAt: string;
}

export default function AccountProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    dateOfBirth: "",
    marketingConsent: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/customers/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.data);
          setForm({
            phone: data.data.phone || "",
            dateOfBirth: data.data.dateOfBirth || "",
            marketingConsent: data.data.marketingConsent || false,
          });
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

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/customers/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          marketingConsent: form.marketingConsent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }
      const data = await res.json();
      setProfile(data.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information
        </p>
      </div>

      {/* Account info from Clerk */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Account Information</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Shield className="mr-1 h-3 w-3" />
              Managed by Clerk
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.imageUrl}
                alt="Avatar"
                className="h-16 w-16 rounded-full border-2 border-accent/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <User className="h-7 w-7 text-accent" />
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-foreground">
                {user?.fullName || "—"}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user?.primaryEmailAddress?.emailAddress || profile?.email || "—"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To change your name, email, or password, use the account button in the top navigation bar.
          </p>
        </CardContent>
      </Card>

      {/* Editable profile fields */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Additional Details</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    if (profile) {
                      setForm({
                        phone: profile.phone || "",
                        dateOfBirth: profile.dateOfBirth || "",
                        marketingConsent: profile.marketingConsent || false,
                      });
                    }
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                <Phone className="mr-1 inline h-3.5 w-3.5" />
                Phone Number
              </label>
              {editing ? (
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              ) : (
                <p className="text-sm font-medium">{profile?.phone || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                <Calendar className="mr-1 inline h-3.5 w-3.5" />
                Date of Birth
              </label>
              {editing ? (
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              ) : (
                <p className="text-sm font-medium">
                  {profile?.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not set"}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Marketing Emails</p>
              <p className="text-xs text-muted-foreground">
                Receive promotions, new product alerts, and health tips
              </p>
            </div>
            {editing ? (
              <button
                type="button"
                role="switch"
                aria-checked={form.marketingConsent}
                onClick={() => setForm((f) => ({ ...f, marketingConsent: !f.marketingConsent }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.marketingConsent ? "bg-accent" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    form.marketingConsent ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            ) : (
              <Badge variant={profile?.marketingConsent ? "default" : "outline"}>
                {profile?.marketingConsent ? "Subscribed" : "Not subscribed"}
              </Badge>
            )}
          </div>

          {memberSince && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Member since {memberSince}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
