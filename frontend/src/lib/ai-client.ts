const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";

export async function callAiService<TReq, TRes>(
  path: string,
  payload: TReq,
  fallback: () => TRes
): Promise<{ data: TRes; source: "python-fastapi" | "local-fallback" }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`AI service HTTP ${res.status}`);
    }
    const data = (await res.json()) as TRes;
    return { data, source: "python-fastapi" };
  } catch {
    return { data: fallback(), source: "local-fallback" };
  }
}
