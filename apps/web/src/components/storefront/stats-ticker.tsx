"use client";

const stats = [
  "5,000+ Orders Shipped",
  "200+ Products",
  "99%+ Avg Purity",
  "48hr Avg Dispatch",
  "Free Shipping Over $99",
  "COA on Every Order",
  "Licensed US Supplier",
  "Third-Party Lab Tested",
];

export function StatsTicker() {
  // Duplicate for seamless loop
  const items = [...stats, ...stats];

  return (
    <section className="overflow-hidden bg-[#010128] py-3">
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: "stats-ticker 30s linear infinite",
        }}
      >
        {items.map((stat, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2 text-sm font-medium text-white/80">
            <span className="h-1 w-1 rounded-full bg-[#7371FC]" />
            {stat}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes stats-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
