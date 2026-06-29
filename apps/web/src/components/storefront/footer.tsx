import Link from "next/link";
import { Shield, Award, Phone } from "lucide-react";

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
              Premium research peptides and health compounds. Licensed US
              supplier delivering quality products nationwide.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-foreground">Shop</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products/category/peptides" className="hover:text-accent transition-colors">Peptides</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link href="/products/category/otc" className="hover:text-foreground transition-colors">OTC Medicines</Link></li>
              <li><Link href="/products/category/vitamins" className="hover:text-foreground transition-colors">Vitamins & Supplements</Link></li>
              <li><Link href="/products/category/first-aid" className="hover:text-foreground transition-colors">First Aid</Link></li>
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

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <span>support@pharmos.com</span>
              </li>
              <li>Mon – Fri, 9am – 6pm ET</li>
            </ul>
          </div>
        </div>

        {/* Pharmacy Compliance Section */}
        <div className="mt-8 border-t pt-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium">Licensed Pharmacy</span>
              <span>License #PH-000000</span>
            </div>
            <span className="hidden md:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-accent" />
              <span>Pharmacist on File: Dr. Jane Smith, PharmD</span>
            </div>
          </div>

          {/* FDA Disclaimer */}
          <div className="mt-4 rounded-lg border border-muted bg-muted/30 px-4 py-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold">FDA Disclaimer:</span> These statements have not been evaluated by the Food and Drug Administration.
              Products sold on this website are not intended to diagnose, treat, cure, or prevent any disease.
              Research compounds are sold for laboratory research purposes only and are not intended for human consumption.
              Always consult with a qualified healthcare professional before using any supplement or health product.
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} Pharmos LLC. All rights reserved.</span>
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
