"use client";

import { useState, useRef } from "react";

export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [zooming, setZooming] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  }

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair overflow-hidden"
      onMouseEnter={() => setZooming(true)}
      onMouseLeave={() => setZooming(false)}
      onMouseMove={handleMouseMove}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200"
        style={zooming ? {
          transform: "scale(2)",
          transformOrigin: `${position.x}% ${position.y}%`,
        } : undefined}
      />
      {!zooming && (
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white">
          Hover to zoom
        </div>
      )}
    </div>
  );
}
