import { prisma } from "@/lib/prisma";

/**
 * Atomically generates the next "PREFIX-NNNNN" reference number for a given
 * prefix (e.g. "LD", "RC", "INV"). Backed by a single-row-per-prefix counter
 * table and a single INSERT ... ON CONFLICT DO UPDATE statement, so
 * concurrent requests (multiple dispatchers creating loads at once) each get
 * a distinct number instead of racing a read-then-write and occasionally
 * generating the same one.
 */
export async function nextSequenceNumber(prefix: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO sequence_counters (key, value)
    VALUES (${prefix}, 10001)
    ON CONFLICT (key) DO UPDATE SET value = sequence_counters.value + 1
    RETURNING value
  `;
  return `${prefix}-${rows[0].value}`;
}

/**
 * Ensures a prefix's counter is at least `atLeast`, without moving it
 * backwards. Used when a load/RC/invoice is created or imported with an
 * explicit reference number, so a later auto-generated number never collides
 * with one a user supplied by hand or via Excel import.
 */
export async function bumpSequenceFloor(prefix: string, atLeast: number): Promise<void> {
  if (!Number.isFinite(atLeast)) return;
  await prisma.$executeRaw`
    INSERT INTO sequence_counters (key, value)
    VALUES (${prefix}, ${atLeast})
    ON CONFLICT (key) DO UPDATE SET value = GREATEST(sequence_counters.value, EXCLUDED.value)
  `;
}

/** Extracts the trailing numeric suffix from a reference number, if any. */
export function parseSequenceSuffix(referenceNumber: string): number | null {
  const match = referenceNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
