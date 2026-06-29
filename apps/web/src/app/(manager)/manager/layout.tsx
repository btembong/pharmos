import type { Metadata, Viewport } from "next";

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
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#010128]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7371FC]">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <span className="text-sm font-bold text-white">Pharmos Manager</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg">{children}</main>
    </div>
  );
}
