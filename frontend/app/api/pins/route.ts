import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildPinsUrl(request: NextRequest) {
  const backendOrigin =
    process.env.LUMEN_BACKEND_URL?.replace(/\/+$/, "") ?? null;

  if (backendOrigin) {
    return `${backendOrigin}/pins/`;
  }

  const lumenBase = (process.env.NEXT_PUBLIC_LUMEN_API_URL ?? "/api/lumen").replace(
    /\/+$/,
    "",
  );

  const requestOrigin = new URL(request.url).origin;
  return `${requestOrigin}${lumenBase}/pins/`;
}

async function fetchPins(request: NextRequest, init?: RequestInit) {
  const url = buildPinsUrl(request);

  return fetch(url, {
    cache: "no-store",
    ...init,
  });
}

async function relayResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": contentType || "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const res = await fetchPins(request);
    return relayResponse(res);
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetchPins(request, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return relayResponse(res);
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
