"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function PushNotificationPrompt() {
  const { getToken } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    // Check if already dismissed this session
    if (sessionStorage.getItem("push-dismissed")) setDismissed(true);
  }, []);

  const subscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID key from API
      const vapidRes = await fetch(`${API_URL}/api/push/vapid-key`);
      if (!vapidRes.ok) throw new Error("Push not configured on server");
      const { data } = await vapidRes.json();

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
      });

      // Send subscription to API
      const token = await getToken();
      await fetch(`${API_URL}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setPermission("granted");
    } catch (err) {
      console.error("Push subscribe error:", err);
      // If permission was denied
      if (Notification.permission === "denied") {
        setPermission("denied");
      }
    } finally {
      setSubscribing(false);
    }
  }, [getToken]);

  // Auto-subscribe if already granted (e.g. returning user)
  useEffect(() => {
    if (permission === "granted" && !dismissed) {
      // Re-register to ensure subscription is active
      subscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("push-dismissed", "1");
  };

  // Don't show if: unsupported, already granted, denied, or dismissed
  if (permission === "unsupported" || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  return (
    <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-[#7371FC]/5 border border-[#7371FC]/15 px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7371FC]/10">
        <Bell className="h-5 w-5 text-[#7371FC]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#010128]">Enable notifications</p>
        <p className="text-xs text-[#010128]/40">Get instant alerts for new orders</p>
      </div>
      <button
        onClick={subscribe}
        disabled={subscribing}
        className="rounded-lg bg-[#7371FC] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 active:scale-95"
      >
        {subscribing ? "..." : "Enable"}
      </button>
      <button onClick={dismiss} className="p-1 text-[#010128]/20 hover:text-[#010128]/40">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
