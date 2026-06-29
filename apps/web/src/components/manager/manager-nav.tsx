"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/manager", label: "Home", icon: Home, exact: true },
  { href: "/manager/orders", label: "Orders", icon: ClipboardList },
  { href: "/manager/settings", label: "Settings", icon: Settings },
];

export function ManagerBottomNav() {
  const pathname = usePathname();

  if (pathname.match(/^\/manager\/[a-f0-9-]{36}$/i)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#010128]/10 bg-white safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                active ? "text-[#7371FC]" : "text-[#010128]/30"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
