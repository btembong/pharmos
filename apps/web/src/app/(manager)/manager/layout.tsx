import type { Metadata, Viewport } from "next";
import { ManagerBottomNav } from "@/components/manager/manager-nav";
import { ManagerHeader } from "@/components/manager/manager-header";

export const metadata: Metadata = {
  title: "Pharmos Manager",
  description: "Staff order management portal",
  manifest: "/manager-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pharmos Manager",
  },
};

export const viewport: Viewport = {
  themeColor: "#7371FC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#010128]">
      <ManagerHeader />
      <main className="mx-auto max-w-lg pb-20">{children}</main>
      <ManagerBottomNav />
    </div>
  );
}
