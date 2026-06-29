"use client";

import { useUser } from "@clerk/nextjs";

export function ManagerHeader() {
  const { user } = useUser();
  const greeting = getGreeting();
  const name = user?.firstName || "Manager";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7371FC]">
            <span className="text-sm font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400">{greeting}</p>
            <p className="text-sm font-bold text-[#010128]">{name}</p>
          </div>
        </div>
        <div className="flex h-8 items-center rounded-full border border-[#7371FC]/20 bg-[#7371FC]/5 px-3">
          <span className="text-[10px] font-bold tracking-wide text-[#7371FC]">PHARMOS</span>
        </div>
      </div>
    </header>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
