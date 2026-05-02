import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Silences the "webpack config but no turbopack config" error.
  // Turbopack is used in dev (where PWA is disabled anyway),
  // webpack handles production builds where next-pwa/workbox runs.
  turbopack: {},
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.209.233.116",
    "jayleen-hydrometrical-uncavalierly.ngrok-free.dev",
    "3fea-148-69-201-206.ngrok-free.app",
  ],
};

export default withPWA(nextConfig);
