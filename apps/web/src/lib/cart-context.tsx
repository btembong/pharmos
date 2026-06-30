"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  requiresPrescription: boolean;
  genericName?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  cartSessionId: string;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "pharmos_cart";
const SESSION_KEY = "pharmos_cart_session";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Fire-and-forget API calls for reservations (non-blocking)
function reserveStock(productId: string, quantity: number, cartSessionId: string) {
  fetch(`${API_URL}/api/inventory/cart/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity, cartSessionId }),
  }).catch(() => {});
}

function releaseStock(productId: string, cartSessionId: string) {
  fetch(`${API_URL}/api/inventory/cart/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, cartSessionId }),
  }).catch(() => {});
}

function releaseAllStock(cartSessionId: string) {
  fetch(`${API_URL}/api/inventory/cart/release-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartSessionId }),
  }).catch(() => {});
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sessionId = useRef<string>("");

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    setItems(loadCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCart(items);
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    if (item.requiresPrescription) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      const newQty = existing ? existing.quantity + quantity : quantity;

      // Reserve the full new quantity (API replaces existing reservation)
      reserveStock(item.productId, newQty, sessionId.current);

      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: newQty }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    releaseStock(productId, sessionId.current);
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      releaseStock(productId, sessionId.current);
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      reserveStock(productId, quantity, sessionId.current);
      setItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    releaseAllStock(sessionId.current);
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, cartSessionId: sessionId.current }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
