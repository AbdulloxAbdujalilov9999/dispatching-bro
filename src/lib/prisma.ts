// The app's data access point. It keeps the historical `prisma` name so every
// page and API route is unchanged, but the data now lives in Google Sheets
// (see src/lib/db). No database server, connection string or Prisma engine.
export { db as prisma, DbError } from "@/lib/db/client";
