import Link from "next/link";
import { FlaskConical, ShieldCheck, Truck } from "lucide-react";

export function StorefrontFooter() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 sm:gap-8">
          {/* Brand */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="Pharmos" className="h-10 w-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Premium research peptides and health compounds. US-based retailer
              delivering quality, lab-tested products nationwide.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5 text-accent" />
                <span>Third-party lab tested — COA with every order</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5 text-accent" />
                <span>Free shipping on orders over $99</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Verified US supplier — ships from the USA</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-foreground">Shop</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products/category/peptides" className="hover:text-accent transition-colors">Peptides</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link href="/products/category/otc" className="hover:text-foreground transition-colors">OTC Medicines</Link></li>
              <li><Link href="/products/category/vitamins" className="hover:text-foreground transition-colors">Vitamins &amp; Supplements</Link></li>
              <li><Link href="/products/category/first-aid" className="hover:text-foreground transition-colors">First Aid</Link></li>
              <li><Link href="/reviews" className="hover:text-foreground transition-colors">Customer Reviews</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-foreground">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/account/orders" className="hover:text-foreground transition-colors">My Orders</Link></li>
              <li><Link href="/track" className="hover:text-foreground transition-colors">Track Order</Link></li>
              <li><Link href="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link></li>
              <li><Link href="/sign-up" className="hover:text-foreground transition-colors">Create Account</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/returns" className="hover:text-foreground transition-colors">Returns Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Research disclaimer */}
        <div className="mt-8 border-t pt-6">
          <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold">Research Use Only:</span> All peptides and research compounds sold on this website are intended
              strictly for in-vitro laboratory research by qualified professionals. They are not intended for human or
              veterinary use, and are not drugs, dietary supplements, or medical devices. These products have not been
              evaluated by the Food and Drug Administration. By purchasing, you confirm you are a qualified researcher
              and agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>.
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} Pharmos. All rights reserved.</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/returns" className="hover:text-foreground transition-colors">Return Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
