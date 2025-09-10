import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portfolio Tracker - Smart Investment Management",
    template: "%s | Portfolio Tracker"
  },
  description: "Advanced portfolio tracker with real-time market data, multi-currency support, AI-powered analysis, and comprehensive P&L tracking. Manage stocks, crypto, and Indonesian assets (IDR/USD) with live exchange rates.",
  keywords: [
    "portfolio tracker",
    "investment management", 
    "stock tracker",
    "crypto tracker",
    "IDR USD conversion",
    "Indonesian stocks",
    "BBCA BMRI TLKM ASII",
    "real-time market data",
    "profit loss tracking",
    "AI investment analysis",
    "multi-currency portfolio",
    "financial dashboard",
    "investment analytics",
    "exchange rates"
  ],
  authors: [{ name: "Portfolio Tracker Team" }],
  creator: "Portfolio Tracker",
  publisher: "Portfolio Tracker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Portfolio Tracker - Smart Investment Management',
    description: 'Track your investments with real-time data, multi-currency support, and AI-powered insights. Supports Indonesian stocks (IDR) and global markets (USD).',
    siteName: 'Portfolio Tracker',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Portfolio Tracker - Investment Management Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portfolio Tracker - Smart Investment Management',
    description: 'Advanced portfolio management with real-time data, multi-currency support, and AI insights.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
  category: 'finance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
