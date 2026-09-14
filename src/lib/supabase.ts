import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only Supabase client using the service role key. Used to upload
 * generated PDFs (rate confirmations, invoices) to a private storage bucket
 * and to mint short-lived signed URLs for viewing/downloading them.
 * Never import this from client components.
 */
export const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";

export async function uploadDocument(path: string, file: Buffer, contentType: string) {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);

  return { path, signedUrl: data?.signedUrl ?? null };
}

export async function getSignedDocumentUrl(path: string, expiresInSeconds = 3600) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
