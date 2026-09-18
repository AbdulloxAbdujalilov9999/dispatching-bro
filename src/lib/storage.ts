import { randomBytes } from "node:crypto";

// Optional file storage on Google Drive, used only for signed Rate Confirmation
// files that dispatchers upload. Generated RC / invoice PDFs are built on demand
// from the sheet data and never need storing.
//
// Drive won't accept uploads from a service account on a personal Google
// account (it has no storage quota), so this authenticates as *you* with an
// OAuth refresh token. See the README for the one-time setup.

const DRIVE_UPLOAD = process.env.GOOGLE_DRIVE_UPLOAD_BASE || "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FILES = process.env.GOOGLE_DRIVE_API_BASE || "https://www.googleapis.com/drive/v3/files";
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";

const PREFIX = "drive:";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

export function isStoredDocument(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && ref.startsWith(PREFIX);
}

export const STORAGE_NOT_CONFIGURED_MESSAGE =
  "File uploads need Google Drive storage. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, " +
  "GOOGLE_OAUTH_REFRESH_TOKEN (and optionally GOOGLE_DRIVE_FOLDER_ID). Generated PDFs work without it.";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  if (!isStorageConfigured()) throw new Error(STORAGE_NOT_CONFIGURED_MESSAGE);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google Drive sign-in failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 120) * 1000 };
  return data.access_token;
}

/** Uploads a file to Drive and returns a reference ("drive:<fileId>") to store on the record. */
export async function uploadDocument(name: string, file: Buffer, contentType: string): Promise<string> {
  const token = await accessToken();
  const boundary = `haulwise-${randomBytes(8).toString("hex")}`;
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const metadata = JSON.stringify({ name, ...(folder ? { parents: [folder] } : {}) });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
    ),
    file,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`Google Drive upload failed (${res.status}): ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  return `${PREFIX}${id}`;
}

/** Fetches a previously uploaded file. */
export async function downloadDocument(ref: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!isStoredDocument(ref)) return null;
  const token = await accessToken();
  const id = encodeURIComponent(ref.slice(PREFIX.length));

  const res = await fetch(`${DRIVE_FILES}/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return {
    data: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}
