const DEFAULT_BACKEND_URL = "/api/lumen";

export function getBackendBaseUrl() {
  return (process.env.NEXT_PUBLIC_LUMEN_API_URL ?? DEFAULT_BACKEND_URL).replace(
    /\/+$/,
    "",
  );
}

export function buildBackendUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}

export async function fetchBackendJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildBackendUrl(path), init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }

    // Surface network/CORS errors with more context and log to console for debugging
    console.error("fetchBackendJson network error when calling", buildBackendUrl(path), err);
    throw new Error(err instanceof Error ? err.message : String(err));
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;

    try {
      const contentType = response.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as {
          detail?: string;
          message?: string;
        };
        detail = payload.detail ?? payload.message ?? detail;
      } else {
        detail = (await response.text()) || detail;
      }
    } catch {
      // Keep the generic status message.
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}