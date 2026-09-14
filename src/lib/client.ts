export class ApiError extends Error {
  issues?: Record<string, string[] | undefined>;
  constructor(message: string, issues?: Record<string, string[] | undefined>) {
    super(message);
    this.issues = issues;
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit & { json?: any } = {}
): Promise<T> {
  const { json, headers, ...rest } = options;

  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let issues: Record<string, string[] | undefined> | undefined;
    try {
      const data = await res.json();
      message = data.error || message;
      issues = data.issues;
    } catch {
      // ignore
    }
    throw new ApiError(message, issues);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
