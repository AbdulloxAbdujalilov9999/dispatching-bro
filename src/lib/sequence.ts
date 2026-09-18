import { prisma } from "@/lib/prisma";

const SEQUENCES = {
  LD: { model: "load", field: "referenceNumber" },
  RC: { model: "rateConfirmation", field: "rcNumber" },
  INV: { model: "invoice", field: "invoiceNumber" },
} as const;

type Prefix = keyof typeof SEQUENCES;

const START = 10000;

/** Extracts the trailing numeric suffix from a reference number, if any. */
export function parseSequenceSuffix(referenceNumber: string): number | null {
  const match = referenceNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

async function highestExisting(prefix: Prefix): Promise<number> {
  const { model, field } = SEQUENCES[prefix];
  const rows: Record<string, string>[] = await (prisma as any)[model].findMany({ select: { [field]: true } });
  let max = START;
  for (const row of rows) {
    const suffix = parseSequenceSuffix(row[field]);
    if (suffix !== null) max = Math.max(max, suffix);
  }
  return max;
}

async function writeCounter(prefix: string, value: number) {
  const existing = await prisma.sequenceCounter.findUnique({ where: { key: prefix } });
  if (existing) {
    if (value > existing.value) await prisma.sequenceCounter.update({ where: { key: prefix }, data: { value } });
  } else {
    await prisma.sequenceCounter.create({ data: { key: prefix, value } });
  }
}

/**
 * Generates the next "PREFIX-NNNNN" reference number (LD-, RC-, INV-).
 *
 * The counter lives in the "Counters" tab and is saved before the caller
 * creates its record, so the number is reserved. It is also never lower than
 * the highest number already used in the data, so it self-heals if someone
 * edits the sheet by hand. Calls within one server instance are serialized;
 * two dispatchers saving in the same fraction of a second on different
 * instances could still draw the same number, in which case the unique-number
 * check rejects the second save (HTTP 409) and they can simply retry.
 */
export async function nextSequenceNumber(prefix: string): Promise<string> {
  const key = prefix as Prefix;
  return prisma.$batch(async () => {
    const counter = await prisma.sequenceCounter.findUnique({ where: { key: prefix } });
    const floor = Math.max(counter?.value ?? START, SEQUENCES[key] ? await highestExisting(key) : START);
    const next = floor + 1;
    await writeCounter(prefix, next);
    return `${prefix}-${next}`;
  }, ["sequenceCounter", ...(SEQUENCES[key] ? [SEQUENCES[key].model] : [])]);
}

/**
 * Ensures a prefix's counter is at least `atLeast`, without moving it
 * backwards. Used when a load/RC/invoice is created or imported with an
 * explicit reference number, so a later auto-generated number never collides
 * with one a user supplied by hand or via Excel import.
 */
export async function bumpSequenceFloor(prefix: string, atLeast: number): Promise<void> {
  if (!Number.isFinite(atLeast)) return;
  await prisma.$batch(() => writeCounter(prefix, atLeast));
}
