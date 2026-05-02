import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND =
  process.env.LUMEN_BACKEND_URL ??
  process.env.NEXT_PUBLIC_LUMEN_API_URL ??
  "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND.replace(/\/+$/, "")}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("Content-Type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { detail: await res.text() };

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
