import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://signalstack-pearl.vercel.app";

const title = "SignalStack — AI Enrichment Pipeline";
const description =
  "Automate B2B prospect research with AI. Submit a company name, extract structured tech signals, score the lead, and stream every pipeline step to a live telemetry dashboard.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "SignalStack",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshots/dashboard-preview.png",
        alt: "SignalStack live telemetry dashboard for AI lead enrichment",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/screenshots/dashboard-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
