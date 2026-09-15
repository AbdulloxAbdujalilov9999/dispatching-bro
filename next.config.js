// next-auth reads process.env.NEXTAUTH_URL at module load time and throws
// (`new URL("")`) if it's set to an empty string rather than left unset —
// which crashes the build on platforms where the variable exists but its
// value is blank. Vercel also gives every deployment (including previews)
// a VERCEL_URL, so fall back to that instead of failing.
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
