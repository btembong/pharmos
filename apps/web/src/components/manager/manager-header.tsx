"use client";

import { useUser } from "@clerk/nextjs";

export function ManagerHeader() {
  const { user } = useUser();
  const greeting = getGreeting();
  const name = user?.firstName || "Manager";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#010128]/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7371FC] to-[#A594F9]">
            <span className="text-sm font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-white/40">{greeting}</p>
            <p className="text-sm font-bold text-white">{name}</p>
          </div>
        </div>
        <div className="flex h-8 items-center rounded-full bg-white/8 px-3">
          <span className="text-[10px] font-semibold text-[#7371FC]">PHARMOS</span>
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
