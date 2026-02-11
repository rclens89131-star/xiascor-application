const DEFAULT_BASE_URL = "http://192.168.1.19:3000";

// support .env (Expo): EXPO_PUBLIC_BASE_URL
export const BASE_URL =
  (process.env.EXPO_PUBLIC_BASE_URL && String(process.env.EXPO_PUBLIC_BASE_URL).trim()) ||
  DEFAULT_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const method = (options.method || "GET").toString().toUpperCase();

  // ✅ Debug visible dans Metro
  console.log("[apiFetch]", method, url);

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = typeof data === "string" ? data : (data?.error || data?.message || `HTTP ${res.status}`);
    console.log("[apiFetch:error]", msg, data);
    throw new Error(msg);
  }
  return data as T;
}
