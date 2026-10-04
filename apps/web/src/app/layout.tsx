import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Pharmos — Research Peptides & Health Products",
    template: "%s | Pharmos",
  },
  description:
    "Buy research-grade peptides, OTC medications, vitamins, and health compounds. US-based retailer with third-party lab testing and COA on every order.",
  metadataBase: new URL("https://pharmospeptide.com"),
  alternates: {
    canonical: "https://pharmospeptide.com",
  },
  openGraph: {
    siteName: "Pharmos",
    locale: "en_US",
    type: "website",
    url: "https://pharmospeptide.com",
    images: [
      {
        url: "/Logo.png",
        width: 1200,
        height: 630,
        alt: "Pharmos — Research Peptides & Health Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmos — Research Peptides & Health Products",
    description: "US-based retailer of research-grade peptides and health compounds. Third-party lab tested, COA with every order.",
    images: ["/Logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Add your Google Search Console verification token below:
  // verification: { google: "YOUR_TOKEN_HERE" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "Pharmos",
  url: "https://pharmospeptide.com",
  description:
    "US-based retailer of research-grade peptides, OTC medications, vitamins, and health compounds. Third-party lab tested with COA on every order.",
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
