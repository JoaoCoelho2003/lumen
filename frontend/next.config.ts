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

const LUMEN_API = process.env.NEXT_PUBLIC_LUMEN_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
    turbopack: {},
    allowedDevOrigins: [
        "localhost",
        "127.0.0.1",
        "10.209.233.116",
        "jayleen-hydrometrical-uncavalierly.ngrok-free.dev",
        "unsturdy-margarett-promising.ngrok-free.dev",
    ],
    async rewrites() {
        return [
            {
                source: "/lumen-api/:path*",
                destination: `${LUMEN_API}/:path*`,
            },
        ];
    },
};

export default withPWA(nextConfig);
