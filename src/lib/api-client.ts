export async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; ok: boolean; status: number }> {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (data as { error?: string }).error || "Something went wrong",
    };
  }
  return { ok: true, status: res.status, data: data as T };
}
