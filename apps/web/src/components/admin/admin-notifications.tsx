"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface NewOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: "new_order" | "low_stock" | "payment";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

// Simple beep using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gain.gain.value = 0.3;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

export function AdminNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const pollOrders = useCallback(async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(
        `${API_URL}/api/orders?limit=20&status=pending_payment`,
        { headers }
      );
      if (!res.ok) return;

      const data = await res.json();
      const orders: NewOrder[] = data.data || [];

      if (isFirstLoad.current) {
        // First load — just record known IDs, don't alert
        orders.forEach((o) => knownOrderIds.current.add(o.id));
        // Convert existing pending orders into notifications (silent)
        const initial: NotificationItem[] = orders.map((o) => ({
          id: o.id,
          type: "new_order" as const,
          title: `Order ${o.orderNumber}`,
          description: `$${Number(o.totalAmount).toFixed(2)} — awaiting payment`,
          time: o.createdAt,
          read: true,
        }));
        setNotifications(initial);
        isFirstLoad.current = false;
        return;
      }

      // Check for new orders we haven't seen
      const newOrders = orders.filter(
        (o) => !knownOrderIds.current.has(o.id)
      );

      if (newOrders.length > 0) {
        newOrders.forEach((o) => knownOrderIds.current.add(o.id));

        const newNotifs: NotificationItem[] = newOrders.map((o) => ({
          id: o.id,
          type: "new_order" as const,
          title: `New Order ${o.orderNumber}`,
          description: `$${Number(o.totalAmount).toFixed(2)} — awaiting payment`,
          time: o.createdAt,
          read: false,
        }));

        setNotifications((prev) => [...newNotifs, ...prev].slice(0, 50));

        // Alert
        playNotificationSound();

        if (newOrders.length === 1) {
          toast.info(`New order: ${newOrders[0].orderNumber}`, {
            description: `$${Number(newOrders[0].totalAmount).toFixed(2)} — awaiting payment`,
          });
        } else {
          toast.info(`${newOrders.length} new orders received`);
        }

        // Try browser notification
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification("New Order", {
            body:
              newOrders.length === 1
                ? `Order ${newOrders[0].orderNumber} — $${Number(newOrders[0].totalAmount).toFixed(2)}`
                : `${newOrders.length} new orders received`,
            icon: "/favicon.ico",
          });
        }
      }
    } catch {
      // Silently fail
    }
  }, [getToken]);

  // Request notification permission on mount
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    pollOrders();
    const interval = setInterval(pollOrders, 30000);
    return () => clearInterval(interval);
  }, [pollOrders]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
