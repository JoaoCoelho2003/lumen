import type { NextConfig } from "next";

const LUMEN_API = process.env.NEXT_PUBLIC_LUMEN_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.209.233.116",
    "jayleen-hydrometrical-uncavalierly.ngrok-free.dev",
    "3fea-148-69-201-206.ngrok-free.app",
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

export default nextConfig;
