import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PharmaFlow — Licensed US Online Pharmacy",
    template: "%s | PharmaFlow",
  },
  description:
    "Shop research peptides, OTC medications, vitamins, and health products. Licensed US pharmacy with fast nationwide delivery.",
  metadataBase: new URL("https://pharmospeptide.com"),
  openGraph: {
    siteName: "PharmaFlow",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Pharmacy",
  name: "PharmaFlow",
  url: "https://pharmospeptide.com",
  description:
    "Licensed US online pharmacy selling OTC medications, research peptides, vitamins, and health products with fast nationwide delivery.",
  areaServed: "US",
  currenciesAccepted: "USD",
  paymentAccepted: "Zelle, Venmo, CashApp, Wire Transfer",
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
        </head>
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
