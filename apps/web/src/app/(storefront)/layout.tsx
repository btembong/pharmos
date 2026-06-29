import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/footer";
import { AIChatbot } from "@/components/storefront/ai-chatbot";
import { CartProvider } from "@/lib/cart-context";
import { CompareProvider } from "@/lib/compare-context";
import { CompareBar } from "@/components/storefront/compare-bar";
import { StickyCartBar } from "@/components/storefront/sticky-cart-bar";
import { Toaster } from "sonner";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <CompareProvider>
      <div className="flex min-h-screen flex-col">
        <StorefrontHeader />
        <main className="flex-1">{children}</main>
        <StorefrontFooter />
      </div>
      <CompareBar />
      <StickyCartBar />
      <AIChatbot />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
    </CompareProvider>
    </CartProvider>
  );
}
