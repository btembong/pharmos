"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  LogOut,
  ExternalLink,
  ChevronRight,
  Smartphone,
} from "lucide-react";

export default function ManagerSettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Staff Member"
    : "Staff Member";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const role = (user?.publicMetadata as { role?: string })?.role || "staff";
  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = name.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2);

  return (
    <div className="px-3 pb-4 pt-4">
      <h1 className="mb-4 text-lg font-bold text-[#010128]">Settings</h1>

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-[#010128]/5 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7371FC]">
            <span className="text-lg font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#010128] truncate">{name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#010128]/40">
              <Mail className="h-3 w-3" />
              <span className="truncate">{email}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-[#7371FC]" />
              <span className="text-xs font-medium text-[#7371FC]">{roleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="mt-5 space-y-1">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[#010128]/30">Account</p>
        <MenuItem icon={User} label="Edit Profile" subtitle="Name, photo, phone"
          onClick={() => window.open("https://accounts.clerk.dev/user", "_blank")} external />
        <MenuItem icon={Shield} label="Security" subtitle="Password, 2FA"
          onClick={() => window.open("https://accounts.clerk.dev/user/security", "_blank")} external />
      </div>

      <div className="mt-5 space-y-1">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[#010128]/30">Navigation</p>
        <MenuItem icon={ExternalLink} label="Admin Dashboard" subtitle="Full back-office"
          onClick={() => router.push("/admin/dashboard")} />
        <MenuItem icon={Smartphone} label="Install App" subtitle="Add to home screen for quick access"
          onClick={() => {}} disabled />
      </div>

      {/* Sign out */}
      <div className="mt-6">
        <button
          onClick={() => signOut(() => router.push("/"))}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#010128]/10 bg-[#010128]/5 py-3 text-sm font-semibold text-[#010128]/60 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* App info */}
      <div className="mt-6 text-center">
        <p className="text-[10px] text-[#010128]/20">Pharmos Manager v1.0</p>
        <p className="text-[10px] text-[#010128]/15">PharmaFlow Platform</p>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, subtitle, onClick, external, disabled }: {
  icon: React.ElementType; label: string; subtitle: string; onClick: () => void; external?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        disabled ? "opacity-40" : "hover:bg-[#7371FC]/5 active:scale-[0.98]"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#010128]/5">
        <Icon className="h-4 w-4 text-[#010128]/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#010128]">{label}</p>
        <p className="text-[11px] text-[#010128]/35">{subtitle}</p>
      </div>
      {external ? (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#010128]/20" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#010128]/20" />
      )}
    </button>
  );
}
