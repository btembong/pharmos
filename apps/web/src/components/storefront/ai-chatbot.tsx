"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, User, ShoppingCart, ExternalLink,
  ThumbsUp, ThumbsDown, Maximize2, Minimize2, Package, Truck,
  ChevronLeft, ChevronRight, Pill, Search, FileText, Heart,
  Shield, Moon, Sun, Sparkles, ArrowRight, Star, Clock,
  MessageSquare, Stethoscope, ClipboardList,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const CHAT_STORAGE_KEY = "pharmos_chat_history";
const DARK_MODE_KEY = "pharmos_chat_dark";
const USER_NAME_KEY = "pharmos_chat_username";

// Rotating placeholder texts
const PLACEHOLDERS = [
  "Ask about medications...",
  "Check drug interactions...",
  "Track your order...",
  "Find health products...",
  "Need a recommendation?",
];

// Welcome screen category tiles
const WELCOME_TILES = [
  { icon: Pill, label: "Browse Products", query: "What products do you have?" },
  { icon: Search, label: "Drug Interactions", query: "I want to check drug interactions" },
  { icon: Package, label: "Track Order", query: "I want to track my order" },
  { icon: Stethoscope, label: "Health Advice", query: "I need health advice" },
  { icon: Star, label: "Best Sellers", query: "What are your best selling products?" },
  { icon: ClipboardList, label: "My Orders", query: "Show me my recent orders" },
];

// Quick action buttons
const QUICK_ACTIONS = [
  { icon: Pill, label: "Products", query: "Show me your products" },
  { icon: Search, label: "Interactions", query: "Check drug interactions" },
  { icon: Package, label: "Track", query: "Track my order" },
  { icon: ShoppingCart, label: "Cart", query: "What's in my cart?" },
];

interface ChatProduct {
  productId: string;
  name: string;
  slug: string;
  price: number | null;
  image: string | null;
}

interface OrderTracking {
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
  timeline: { toStatus: string; createdAt: string; note: string | null }[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
  suggestions?: string[];
  tracking?: OrderTracking | null;
  feedback?: "up" | "down" | null;
  timestamp?: number;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// Persistence
function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-50)));
  } catch {}
}

function loadDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DARK_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

// Order number detection
const ORDER_REGEX = /PF-\d{4}-\d{4,6}/i;

function extractOrderNumber(text: string): string | null {
  const match = text.match(ORDER_REGEX);
  return match ? match[0].toUpperCase() : null;
}

// Status helpers
const STATUS_STEPS = [
  { key: "pending_payment", label: "Payment", icon: FileText },
  { key: "confirmed", label: "Confirmed", icon: Shield },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "packed", label: "Packed", icon: Package },
  { key: "dispatched", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Heart },
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ORDER = ["pending_payment", "confirmed", "processing", "packed", "dispatched", "out_for_delivery", "delivered"];

// Contextual typing messages
const TYPING_MESSAGES = [
  "PharmosAI is researching...",
  "Looking up products...",
  "Checking our pharmacy database...",
  "Finding the best options...",
];

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [awaitingName, setAwaitingName] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [typingMsg, setTypingMsg] = useState(TYPING_MESSAGES[0]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPulse, setShowPulse] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { items, addItem } = useCart();

  // Load persisted state
  useEffect(() => {
    const saved = loadMessages();
    setDarkMode(loadDarkMode());
    const savedName = localStorage.getItem(USER_NAME_KEY);
    if (savedName) setUserName(savedName);
    if (saved.length > 0) {
      setMessages(saved);
      setShowWelcome(false);
    }
    setLoaded(true);
  }, []);

  // Save messages on change
  useEffect(() => {
    if (loaded) saveMessages(messages);
  }, [messages, loaded]);

  // Save dark mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DARK_MODE_KEY, String(darkMode));
    }
  }, [darkMode]);

  // Rotate placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotate typing message
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setTypingMsg(TYPING_MESSAGES[Math.floor(Math.random() * TYPING_MESSAGES.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus textarea on open
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  // Show tooltip after 3 seconds on first visit
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    const hideTimer = setTimeout(() => setShowTooltip(false), 8000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, []);

  // Hide pulse after first open
  useEffect(() => {
    if (open) setShowPulse(false);
  }, [open]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }, []);

  // ─── Order tracking ─────────────────────────────────────────────────────────

  async function fetchTracking(orderNumber: string): Promise<OrderTracking | null> {
    try {
      const res = await fetch(`${API_URL}/api/ai/track/${orderNumber}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data ?? null;
    } catch {
      return null;
    }
  }

  // ─── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    setShowWelcome(false);

    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    // Handle name capture if we asked for it
    if (awaitingName) {
      const name = text.split(/\s+/).slice(0, 3).join(" "); // take up to 3 words
      setUserName(name);
      localStorage.setItem(USER_NAME_KEY, name);
      setAwaitingName(false);
      setMessages(prev => [...prev, {
        id: genId(),
        role: "assistant",
        content: `Nice to meet you, **${name}**! I'm PharmosAI, your pharmacy assistant. How can I help you today?`,
        suggestions: ["Browse products", "Check drug interactions", "Track my order"],
        timestamp: Date.now(),
      }]);
      setLoading(false);
      return;
    }

    // Check for order tracking request
    const orderNum = extractOrderNumber(text);
    if (orderNum || /track|where.*order|order.*status/i.test(text)) {
      const trackNum = orderNum || extractOrderNumber(messages.map(m => m.content).join(" "));
      if (trackNum) {
        const tracking = await fetchTracking(trackNum);
        const prefix = userName ? `${userName}, here's` : "Here's";
        const assistantMsg: Message = {
          id: genId(),
          role: "assistant",
          content: tracking
            ? `${prefix} the status for order **${trackNum}**:`
            : `I couldn't find order **${trackNum}**. Please double-check the order number (format: PF-2026-000001).`,
          tracking,
          suggestions: tracking ? ["When will it arrive?", "Contact support"] : ["Try another number", "Contact support"],
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (!open) setUnreadCount(c => c + 1);
        setLoading(false);
        return;
      }
    }

    // Regular AI chat
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          context: {
            cartItems: items.map(i => i.name),
            userName: userName || undefined,
          },
        }),
      });

      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      const reply = data.data?.reply || "Sorry, I couldn't process that.";
      const products = data.data?.products || [];
      const suggestions = data.data?.suggestions || [];

      setMessages(prev => [...prev, {
        id: genId(),
        role: "assistant",
        content: typeof reply === "string" ? reply : JSON.stringify(reply),
        products,
        suggestions,
        timestamp: Date.now(),
      }]);
      if (!open) setUnreadCount(c => c + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: genId(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble connecting. Please try again in a moment.",
        suggestions: ["Try again"],
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, items, open, awaitingName, userName]);

  // ─── Feedback ───────────────────────────────────────────────────────────────

  function handleFeedback(msgId: string, rating: "up" | "down") {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: rating } : m));
    const msg = messages.find(m => m.id === msgId);
    const prevUserMsg = messages[messages.indexOf(msg!) - 1];
    fetch(`${API_URL}/api/ai/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageContent: msg?.content || "",
        rating,
        userMessage: prevUserMsg?.role === "user" ? prevUserMsg.content : undefined,
      }),
    }).catch(() => {});
    toast.success(rating === "up" ? "Thanks for the feedback!" : "We'll work on improving this");
  }

  // ─── Quick add to cart ──────────────────────────────────────────────────────

  function handleQuickAdd(product: ChatProduct) {
    addItem({
      productId: product.productId,
      name: product.name,
      slug: product.slug,
      price: product.price || 0,
      image: product.image,
      strength: null,
      dosageForm: null,
      packSize: null,
      requiresPrescription: false,
    });
    toast.success(`${product.name} added to cart`);
  }

  // ─── Clear chat ─────────────────────────────────────────────────────────────

  function clearChat() {
    setMessages([]);
    setShowWelcome(true);
  }

  // ─── Format timestamp ──────────────────────────────────────────────────────

  function formatTime(ts?: number) {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ─── Theme classes ────────────────────────────────────────────────────────

  const theme = darkMode
    ? {
        bg: "bg-[#0d1117]",
        bgSecondary: "bg-[#161b22]",
        bgBubbleBot: "bg-[#1c2333]",
        bgBubbleUser: "bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light",
        text: "text-gray-100",
        textMuted: "text-gray-400",
        textMicro: "text-gray-500",
        border: "border-[#30363d]",
        inputBg: "bg-[#161b22]",
        inputBorder: "border-[#30363d] focus:border-pharmos-violet",
        cardBg: "bg-[#161b22]",
        cardBorder: "border-[#30363d]",
        headerBg: "bg-gradient-to-r from-[#0d1117] to-[#161b22]",
        hover: "hover:bg-[#1c2333]",
      }
    : {
        bg: "bg-white",
        bgSecondary: "bg-gray-50",
        bgBubbleBot: "bg-pharmos-lavender-pale",
        bgBubbleUser: "bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light",
        text: "text-foreground",
        textMuted: "text-muted-foreground",
        textMicro: "text-muted-foreground/50",
        border: "border-border",
        inputBg: "bg-muted/30",
        inputBorder: "border-border focus:border-pharmos-violet",
        cardBg: "bg-white",
        cardBorder: "border-border",
        headerBg: "bg-gradient-to-r from-pharmos-indigo to-[#1a1a4e]",
        hover: "hover:bg-muted",
      };

  // ─── Size classes ─────────────────────────────────────────────────────────

  const sizeClass = expanded
    ? "fixed inset-3 z-50 sm:inset-6"
    : "fixed bottom-6 right-6 z-50 h-[560px] w-[420px] max-sm:inset-x-2 max-sm:bottom-2 max-sm:h-[calc(100dvh-4rem)] max-sm:w-auto";

  return (
    <>
      {/* ── Floating Button ── */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute -left-48 bottom-2 w-44 rounded-xl bg-pharmos-indigo px-3 py-2 text-xs text-white shadow-lg animate-in fade-in slide-in-from-right-2 duration-300">
              <p className="font-medium">Need help?</p>
              <p className="mt-0.5 opacity-70">Chat with PharmosAI</p>
              <div className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 bg-pharmos-indigo" />
            </div>
          )}

          {/* Pulse ring */}
          {showPulse && (
            <span className="absolute inset-0 animate-ping rounded-full bg-pharmos-violet/30" />
          )}

          {/* Button */}
          <button
            onClick={() => setOpen(true)}
            onMouseEnter={() => setShowTooltip(false)}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pharmos-violet to-pharmos-violet-light text-white shadow-lg shadow-pharmos-violet/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-pharmos-violet/30 active:scale-95"
            aria-label="Open PharmosAI chat"
          >
            {/* Pharmacy cross icon */}
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z" fill="currentColor" opacity="0.9" />
            </svg>

            {/* Sparkle accent */}
            <Sparkles className="absolute -right-0.5 -top-0.5 h-4 w-4 text-yellow-300 drop-shadow-sm" />

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Chat Window ── */}
      {open && (
        <div
          className={`${sizeClass} flex flex-col overflow-hidden rounded-2xl ${theme.border} border ${theme.bg} shadow-2xl shadow-black/10 transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in`}
        >
          {/* ── Header ── */}
          <div className={`${theme.headerBg} px-4 py-3 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z" fill="currentColor" opacity="0.9" />
                  </svg>
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-[#010128]" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">PharmosAI</p>
                  <p className="flex items-center gap-1 text-[11px] opacity-70">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                    Licensed Pharmacy Assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="rounded-lg p-1.5 opacity-60 transition-opacity hover:bg-white/10 hover:opacity-100"
                  title={darkMode ? "Light mode" : "Dark mode"}
                >
                  {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={clearChat}
                  className="rounded-lg p-1.5 opacity-60 transition-opacity hover:bg-white/10 hover:opacity-100"
                  title="Clear chat"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="rounded-lg p-1.5 opacity-60 transition-opacity hover:bg-white/10 hover:opacity-100"
                  title={expanded ? "Minimize" : "Fullscreen"}
                >
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => { setOpen(false); setExpanded(false); }}
                  className="rounded-lg p-1.5 opacity-60 transition-opacity hover:bg-white/10 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Messages / Welcome ── */}
          <div ref={scrollRef} className={`flex-1 overflow-y-auto ${showWelcome && messages.length === 0 ? "" : "p-4 space-y-3"}`}>
            {/* Welcome Screen */}
            {showWelcome && messages.length === 0 ? (
              <WelcomeScreen
                darkMode={darkMode}
                theme={theme}
                userName={userName}
                onSelect={(query) => handleSend(query)}
                onStartChat={() => {
                  setShowWelcome(false);
                  if (!userName) {
                    setAwaitingName(true);
                    setMessages([{
                      id: genId(),
                      role: "assistant",
                      content: "Hi there! I'm **PharmosAI**, your personal pharmacy assistant. Before we get started, what's your name?",
                      timestamp: Date.now(),
                    }]);
                  } else {
                    setMessages([{
                      id: genId(),
                      role: "assistant",
                      content: `Welcome back, **${userName}**! How can I help you today?`,
                      suggestions: ["Browse products", "Check drug interactions", "Track my order"],
                      timestamp: Date.now(),
                    }]);
                  }
                }}
              />
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}>
                    {/* Message bubble */}
                    <div className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pharmos-violet/20 to-pharmos-violet-light/20">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-pharmos-violet" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z" fill="currentColor" opacity="0.8" />
                          </svg>
                        </div>
                      )}
                      <div className="max-w-[80%] space-y-0.5">
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? `${theme.bgBubbleUser} text-white rounded-br-sm`
                              : `${theme.bgBubbleBot} ${theme.text} rounded-bl-sm`
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className={`chat-markdown prose prose-sm max-w-none ${darkMode ? "prose-invert" : ""} prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold`}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {/* Timestamp on hover */}
                        <p className={`px-1 text-[10px] ${theme.textMicro} opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100`} style={{ opacity: 0.4 }}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pharmos-violet/10">
                          <User className="h-3.5 w-3.5 text-pharmos-violet" />
                        </div>
                      )}
                    </div>

                    {/* Order tracking card */}
                    {msg.tracking && (
                      <div className="ml-9 mt-2">
                        <OrderTrackingCard tracking={msg.tracking} darkMode={darkMode} theme={theme} />
                      </div>
                    )}

                    {/* Product cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="ml-9 mt-2">
                        {msg.products.length >= 3 ? (
                          <ProductCarousel products={msg.products} onAdd={handleQuickAdd} darkMode={darkMode} theme={theme} />
                        ) : (
                          <div className="space-y-2">
                            {msg.products.map((product) => (
                              <ProductCard key={product.productId} product={product} onAdd={handleQuickAdd} darkMode={darkMode} theme={theme} />
                            ))}
                          </div>
                        )}
                        {msg.products.length >= 3 && (
                          <Link href="/products" className={`mt-2 inline-flex items-center gap-1 text-xs font-medium text-pharmos-violet hover:underline`}>
                            View all products <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Feedback buttons */}
                    {msg.role === "assistant" && msg.content.length > 20 && (
                      <div className="ml-9 mt-1 flex items-center gap-1">
                        {msg.feedback ? (
                          <span className={`text-[10px] ${theme.textMicro}`}>
                            {msg.feedback === "up" ? "Helpful" : "Not helpful"} - thanks!
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleFeedback(msg.id, "up")}
                              className={`rounded-md p-1 ${theme.textMicro} transition-colors hover:bg-green-500/10 hover:text-green-500`}
                              title="Helpful"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, "down")}
                              className={`rounded-md p-1 ${theme.textMicro} transition-colors hover:bg-red-500/10 hover:text-red-500`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Follow-up suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && msg === messages[messages.length - 1] && !loading && (
                      <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSend(s)}
                            className={`rounded-full ${theme.cardBorder} border px-3 py-1 text-xs font-medium ${theme.textMuted} shadow-sm transition-all hover:border-pharmos-violet hover:text-pharmos-violet ${darkMode ? "hover:bg-pharmos-violet/10" : "hover:bg-pharmos-lavender-pale"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex gap-2.5 animate-in fade-in duration-200">
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pharmos-violet/20 to-pharmos-violet-light/20">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-pharmos-violet animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z" fill="currentColor" opacity="0.8" />
                      </svg>
                    </div>
                    <div className={`rounded-2xl rounded-bl-sm ${theme.bgBubbleBot} px-4 py-3`}>
                      <div className="flex items-center gap-2.5">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pharmos-violet/60" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pharmos-violet/60" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pharmos-violet/60" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className={`text-[11px] ${theme.textMicro}`}>{typingMsg}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Quick Actions Bar ── */}
          {!showWelcome && (
            <div className={`flex items-center gap-1 border-t ${theme.border} px-3 py-1.5 ${theme.bgSecondary}`}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.query)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${theme.textMuted} transition-all ${darkMode ? "hover:bg-pharmos-violet/10 hover:text-pharmos-violet" : "hover:bg-pharmos-lavender-pale hover:text-pharmos-violet"}`}
                  disabled={loading}
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Area ── */}
          <div className={`border-t ${theme.border} p-3 ${theme.bg}`}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                className={`flex-1 resize-none rounded-xl ${theme.inputBg} ${theme.inputBorder} border px-3.5 py-2.5 text-sm ${theme.text} outline-none transition-colors focus:ring-1 focus:ring-pharmos-violet/20 placeholder:${theme.textMicro}`}
                rows={1}
                style={{ maxHeight: 100 }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light text-white shadow-md shadow-pharmos-violet/20 transition-all hover:shadow-lg hover:shadow-pharmos-violet/30 disabled:opacity-40 disabled:shadow-none active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {/* Trust badges */}
            <div className={`mt-2 flex items-center justify-center gap-2 text-[10px] ${theme.textMicro}`}>
              <span className="flex items-center gap-0.5">
                <Shield className="h-2.5 w-2.5" /> Licensed Pharmacy
              </span>
              <span className="opacity-30">|</span>
              <span>AI-assisted - verified by pharmacist</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Welcome Screen ────────────────────────────────────────────────────────

function WelcomeScreen({
  darkMode,
  theme,
  userName,
  onSelect,
  onStartChat,
}: {
  darkMode: boolean;
  theme: Record<string, string>;
  userName: string | null;
  onSelect: (query: string) => void;
  onStartChat: () => void;
}) {
  return (
    <div className={`flex h-full flex-col items-center justify-center p-6 ${theme.bg}`}>
      {/* Bot avatar */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pharmos-lavender">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-pharmos-violet" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6z" fill="currentColor" opacity="0.9" />
        </svg>
      </div>

      <h3 className={`text-lg font-bold ${theme.text}`}>
        {userName ? `Welcome back, ${userName}!` : "Hi! I'm PharmosAI"}
      </h3>
      <p className={`mt-1 text-center text-sm ${theme.textMuted}`}>
        {userName
          ? "Your AI pharmacy assistant is ready. What can I help you with?"
          : "Your personal pharmacy assistant. Let's get to know each other!"}
      </p>

      {/* Start chat button (asks for name if new user) */}
      {!userName && (
        <button
          onClick={onStartChat}
          className="mt-4 rounded-xl bg-pharmos-violet px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
        >
          Start chatting
        </button>
      )}

      {/* Category tiles */}
      <div className={`${userName ? "mt-5" : "mt-4"} grid w-full grid-cols-2 gap-2`}>
        {WELCOME_TILES.map((tile) => (
          <button
            key={tile.label}
            onClick={() => {
              if (!userName) { onStartChat(); return; }
              onSelect(tile.query);
            }}
            className={`group flex flex-col items-center gap-2 rounded-xl ${theme.cardBg} ${theme.cardBorder} border p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${darkMode ? "hover:border-pharmos-violet/50" : "hover:border-pharmos-violet/30"}`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pharmos-lavender text-pharmos-violet">
              <tile.icon className="h-4 w-4" />
            </div>
            <span className={`text-xs font-medium ${theme.text}`}>{tile.label}</span>
          </button>
        ))}
      </div>

      <p className={`mt-5 text-center text-[10px] ${theme.textMicro}`}>
        {userName ? "Or just type your question below" : "Let me know your name and we'll get started"}
      </p>
    </div>
  );
}

// ─── Order Tracking Card (Enhanced) ────────────────────────────────────────

function OrderTrackingCard({
  tracking,
  darkMode,
  theme,
}: {
  tracking: OrderTracking;
  darkMode: boolean;
  theme: Record<string, string>;
}) {
  const currentIdx = STATUS_ORDER.indexOf(tracking.status);

  return (
    <div className={`rounded-xl ${theme.cardBorder} border ${theme.cardBg} p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pharmos-violet/10">
            <Package className="h-4 w-4 text-pharmos-violet" />
          </div>
          <div>
            <span className={`font-mono text-sm font-bold ${theme.text}`}>{tracking.orderNumber}</span>
            <p className={`text-[11px] ${theme.textMuted}`}>
              {STATUS_LABELS[tracking.status] || tracking.status}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-pharmos-violet/10 px-2.5 py-1 text-[11px] font-semibold text-pharmos-violet">
          {STATUS_LABELS[tracking.status] || tracking.status}
        </span>
      </div>

      {/* Visual stepper */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.key} className="flex flex-col items-center" style={{ flex: 1 }}>
                <div className="relative flex items-center justify-center w-full">
                  {/* Connector line left */}
                  {i > 0 && (
                    <div className={`absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${i <= currentIdx ? "bg-pharmos-violet" : darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                  )}
                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                      active
                        ? "bg-pharmos-violet text-white ring-4 ring-pharmos-violet/20"
                        : done
                        ? "bg-pharmos-violet text-white"
                        : darkMode
                        ? "bg-gray-700 text-gray-500"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <step.icon className="h-3 w-3" />
                  </div>
                </div>
                <span className={`mt-1.5 text-[9px] font-medium ${active ? "text-pharmos-violet" : theme.textMicro}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrier info */}
      {tracking.courierName && (
        <div className={`flex items-center gap-2 rounded-lg ${theme.bgSecondary} p-2 text-xs ${theme.textMuted}`}>
          <Truck className="h-3.5 w-3.5 text-pharmos-violet" />
          <span className="font-medium">{tracking.courierName}</span>
          {tracking.trackingNumber && (
            <span className="font-mono opacity-70">{tracking.trackingNumber}</span>
          )}
        </div>
      )}

      {/* Estimated delivery */}
      {tracking.estimatedDelivery && (
        <p className={`mt-2 text-xs ${theme.textMuted}`}>
          Estimated delivery: <strong className={theme.text}>{new Date(tracking.estimatedDelivery).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</strong>
        </p>
      )}

      {/* Track button */}
      {tracking.trackingUrl && (
        <a
          href={tracking.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
        >
          Track with {tracking.courierName} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ─── Product Card (Redesigned) ─────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
  darkMode,
  theme,
}: {
  product: ChatProduct;
  onAdd: (p: ChatProduct) => void;
  darkMode: boolean;
  theme: Record<string, string>;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl ${theme.cardBorder} border ${theme.cardBg} p-2.5 shadow-sm transition-all hover:shadow-md ${darkMode ? "hover:border-pharmos-violet/30" : "hover:border-pharmos-violet/20"}`}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-pharmos-lavender-pale to-pharmos-lavender">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Pill className="h-6 w-6 text-pharmos-violet/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product.slug}`} className={`block truncate text-sm font-semibold ${theme.text} hover:text-pharmos-violet transition-colors`}>
          {product.name}
        </Link>
        {product.price !== null && (
          <p className="text-sm font-bold text-pharmos-violet">${product.price.toFixed(2)}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={() => onAdd(product)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
          title="Add to cart"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/products/${product.slug}`}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.cardBorder} border ${theme.textMuted} transition-colors ${theme.hover}`}
          title="View product"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Product Carousel (Redesigned) ─────────────────────────────────────────

function ProductCarousel({
  products,
  onAdd,
  darkMode,
  theme,
}: {
  products: ChatProduct[];
  onAdd: (p: ChatProduct) => void;
  darkMode: boolean;
  theme: Record<string, string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeDot, setActiveDot] = useState(0);

  function updateScrollState() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    const dotIdx = Math.round(scrollLeft / 160);
    setActiveDot(Math.min(dotIdx, products.length - 1));
  }

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -170 : 170, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`absolute -left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${theme.cardBg} ${theme.cardBorder} border shadow-md transition-transform hover:scale-110`}
        >
          <ChevronLeft className="h-3.5 w-3.5 text-pharmos-violet" />
        </button>
      )}

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((product) => (
          <div
            key={product.productId}
            className={`flex w-[155px] shrink-0 flex-col rounded-xl ${theme.cardBorder} border ${theme.cardBg} p-2.5 shadow-sm transition-all hover:shadow-md ${darkMode ? "hover:border-pharmos-violet/30" : "hover:border-pharmos-violet/20"}`}
          >
            <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-pharmos-lavender-pale to-pharmos-lavender">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <Pill className="h-8 w-8 text-pharmos-violet/30" />
              )}
            </div>
            <Link href={`/products/${product.slug}`} className={`mb-1 line-clamp-2 text-xs font-semibold leading-tight ${theme.text} hover:text-pharmos-violet transition-colors`}>
              {product.name}
            </Link>
            {product.price !== null && (
              <p className="mb-2 text-sm font-bold text-pharmos-violet">${product.price.toFixed(2)}</p>
            )}
            <button
              onClick={() => onAdd(product)}
              className="mt-auto flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-pharmos-violet to-pharmos-violet-light py-1.5 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
            >
              <ShoppingCart className="h-3 w-3" /> Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`absolute -right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${theme.cardBg} ${theme.cardBorder} border shadow-md transition-transform hover:scale-110`}
        >
          <ChevronRight className="h-3.5 w-3.5 text-pharmos-violet" />
        </button>
      )}

      {/* Dot indicators */}
      {products.length > 2 && (
        <div className="mt-1.5 flex justify-center gap-1">
          {products.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === activeDot ? "w-4 bg-pharmos-violet" : `w-1 ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
