"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ShoppingCart,
  Clock,
  CheckCircle,
  X,
} from "lucide-react";
import { useNotifications } from "./admin-notifications";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/inventory": "Inventory",
  "/admin/banners": "Banners",
  "/admin/customers": "Customers",
  "/admin/payments": "Payments",
  "/admin/tax-rates": "Tax Rates",
  "/admin/interactions": "Drug Interactions",
  "/admin/subscriptions": "Subscriptions",
  "/admin/settings": "Settings",
};

export function AdminHeader() {
  const pathname = usePathname();
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ||
    "Admin";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-semibold text-primary">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick link to orders */}
        <Link
          href="/admin/orders"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ShoppingCart className="h-4 w-4" />
        </Link>

        {/* Notification bell */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => {
              setOpen(!open);
              if (!open && unreadCount > 0) markAllRead();
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold text-primary">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      All caught up
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <Link
                      key={n.id}
                      href="/admin/orders"
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/50 ${
                        !n.read ? "bg-accent/5" : ""
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          n.type === "new_order"
                            ? "bg-accent/10 text-accent"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            !n.read ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {n.description}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTimeAgo(n.time)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </Link>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t px-4 py-2.5">
                  <Link
                    href="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="block text-center text-xs font-medium text-accent hover:underline"
                  >
                    View all orders
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
