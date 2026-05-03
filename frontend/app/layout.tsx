import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { Noto_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import InstallPrompt from "@/components/InstallPrompt";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Lumen - Safer Navigation",
  description:
    "Safer navigation app that finds routes avoiding high-risk areas using community reports and public data, while prioritizing better-lit streets and real-world data for smarter, safer travel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumen",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Lumen - Safer Navigation",
    description: "Navigate safely with community-powered route intelligence.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#8200db",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased dark", "font-sans", notoSans.variable)}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full overflow-hidden bg-background text-foreground">
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  );
}
