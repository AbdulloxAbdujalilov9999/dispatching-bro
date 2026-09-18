// Checks the Google credentials, creates any missing tabs / header rows in the
// Google Sheet, and reports how many rows each tab holds.
import { MODELS } from "@/lib/db/schema";
import { ensureSchema, getTables } from "@/lib/db/store";
import { getServiceAccount, getSheetId } from "@/lib/db/google";

async function main() {
  const { email } = getServiceAccount();
  console.log(`Service account: ${email}`);
  console.log(`Spreadsheet:     https://docs.google.com/spreadsheets/d/${getSheetId()}`);

  await ensureSchema();
  const tables = await getTables(Object.keys(MODELS), true);

  console.log("\nTabs ready:");
  for (const [name, table] of tables) {
    console.log(`  ${MODELS[name].sheet.padEnd(18)} ${String(table.rows.length).padStart(5)} rows`);
  }
  console.log("\nAll set. Run `npm run db:seed` to add the demo data and first logins.");
}

main().catch((error) => {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
