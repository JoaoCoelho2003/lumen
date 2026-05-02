import type { Metadata } from "next";
import "./globals.css";
import { Noto_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Lumen Portugal Navigation",
  description: "Mapbox-powered turn-by-turn navigation for Portugal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={cn("h-full antialiased dark", "font-sans", notoSans.variable)}
    >
      <body className="min-h-full overflow-hidden bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
