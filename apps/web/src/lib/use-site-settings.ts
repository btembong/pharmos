"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
let cached: Record<string, string> | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cached ?? {});
  const [loaded, setLoaded] = useState(!!cached);

  useEffect(() => {
    if (cached) return;
    fetch(`${API_URL}/api/settings/site`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.data || {};
        cached = s;
        setSettings(s);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return { settings, loaded };
}
