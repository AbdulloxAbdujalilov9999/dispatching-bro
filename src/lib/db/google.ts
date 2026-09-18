import { createSign } from "node:crypto";

// Minimal Google API client (service-account auth + fetch with retry). Written
// against the raw REST APIs so the app needs no extra dependencies.

const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
export const SHEETS_BASE = process.env.GOOGLE_SHEETS_API_BASE || "https://sheets.googleapis.com/v4/spreadsheets";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

interface ServiceAccount {
  email: string;
  privateKey: string;
}

let cachedAccount: ServiceAccount | null = null;

export function getServiceAccount(): ServiceAccount {
  if (cachedAccount) return cachedAccount;

  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (json) {
    try {
      const text = json.trim().startsWith("{") ? json : Buffer.from(json, "base64").toString("utf8");
      const parsed = JSON.parse(text);
      email = parsed.client_email;
      privateKey = parsed.private_key;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (or base64-encoded JSON).");
    }
  }

  if (!email || !privateKey) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SHEET_ID plus either GOOGLE_SERVICE_ACCOUNT_JSON, " +
        "or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  // Env vars often store the key with literal "\n" sequences and stray quotes.
  privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  cachedAccount = { email, privateKey };
  return cachedAccount;
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID is not set.");
  return id;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const auth: { tokenCache: { token: string; expiresAt: number } | null; tokenInflight: Promise<string> | null } = ((
  globalThis as any
).__sheetsAuth ??= { tokenCache: null, tokenInflight: null });

async function fetchAccessToken(): Promise<string> {
  const { email, privateKey } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({ iss: email, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(privateKey);
  const assertion = `${header}.${claim}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new GoogleApiError(`Google sign-in failed (${res.status}): ${await res.text()}`, res.status);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  auth.tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 120) * 1000 };
  return data.access_token;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && auth.tokenCache && auth.tokenCache.expiresAt > Date.now()) return auth.tokenCache.token;
  if (!auth.tokenInflight || forceRefresh) {
    auth.tokenInflight = fetchAccessToken().finally(() => {
      auth.tokenInflight = null;
    });
  }
  return auth.tokenInflight;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Authenticated JSON request to a Google API with retry/backoff on quota and transient errors. */
export async function googleJson<T = any>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let refreshed = false;

  for (let attempt = 1; ; attempt++) {
    const token = await getAccessToken();
    const res = await fetch(url, {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (res.ok) return (await res.json()) as T;

    if (res.status === 401 && !refreshed) {
      refreshed = true;
      await getAccessToken(true);
      continue;
    }

    if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 400 * 2 ** (attempt - 1));
      await sleep(backoff + Math.random() * 250);
      continue;
    }

    throw new GoogleApiError(await describeError(res), res.status);
  }
}

async function describeError(res: Response): Promise<string> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message || JSON.stringify(body);
  } catch {
    detail = res.statusText;
  }

  if (res.status === 403 || res.status === 404) {
    let email = "";
    try {
      email = getServiceAccount().email;
    } catch {}
    return (
      `Google Sheets refused access (${res.status}): ${detail}. ` +
      `Check GOOGLE_SHEET_ID and that the sheet is shared with ${email || "the service account"} as an Editor.`
    );
  }
  return `Google Sheets request failed (${res.status}): ${detail}`;
}
