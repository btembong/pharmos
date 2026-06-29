"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  manufacturer: string | null;
  genericName?: string | null;
}

interface CompareContextType {
  items: CompareProduct[];
  addItem: (product: CompareProduct) => void;
  removeItem: (productId: string) => void;
  isInCompare: (productId: string) => boolean;
  clear: () => void;
  showDrawer: boolean;
  setShowDrawer: (v: boolean) => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareProduct[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  const addItem = useCallback((product: CompareProduct) => {
    setItems((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const isInCompare = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  );

  const clear = useCallback(() => {
    setItems([]);
    setShowDrawer(false);
  }, []);

  return (
    <CompareContext.Provider value={{ items, addItem, removeItem, isInCompare, clear, showDrawer, setShowDrawer }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
