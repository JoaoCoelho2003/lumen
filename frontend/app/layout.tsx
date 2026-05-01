import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full overflow-hidden bg-black">{children}</body>
    </html>
  );
}
