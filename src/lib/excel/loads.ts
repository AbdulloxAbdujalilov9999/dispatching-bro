import ExcelJS from "exceljs";
import type { Load, Customer, Carrier, Driver } from "@prisma/client";

const SHEET_NAME = "Loads";

// Single source of truth for column order/headers, shared by export and
// import so the two always agree on what each column means.
const COLUMNS = [
  { header: "Reference Number", key: "referenceNumber", width: 18 },
  { header: "Status", key: "status", width: 14 },
  { header: "Customer", key: "customer", width: 24 },
  { header: "Carrier", key: "carrier", width: 24 },
  { header: "Driver", key: "driver", width: 20 },
  { header: "Pickup Location", key: "pickupLocation", width: 20 },
  { header: "Pickup Date", key: "pickupDate", width: 18 },
  { header: "Delivery Location", key: "deliveryLocation", width: 20 },
  { header: "Delivery Date", key: "deliveryDate", width: 18 },
  { header: "Commodity", key: "commodity", width: 18 },
  { header: "Weight (lbs)", key: "weightLbs", width: 12 },
  { header: "Equipment", key: "equipment", width: 14 },
  { header: "Customer Rate", key: "customerRate", width: 14 },
  { header: "Carrier Rate", key: "carrierRate", width: 14 },
  { header: "Notes", key: "notes", width: 30 },
  { header: "Created At", key: "createdAt", width: 18 },
] as const;

const DATE_FORMAT = "yyyy-mm-dd hh:mm";

export type LoadForExport = Load & {
  customer: Customer | null;
  carrier: Carrier | null;
  driver: Driver | null;
};

export async function buildLoadsWorkbook(loads: LoadForExport[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Haulwise Dispatch";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };

  for (const load of loads) {
    const row = sheet.addRow({
      referenceNumber: load.referenceNumber,
      status: load.status,
      customer: load.customer?.name || "",
      carrier: load.carrier?.name || "",
      driver: load.driver?.name || "",
      pickupLocation: load.pickupLocation,
      pickupDate: load.pickupDate,
      deliveryLocation: load.deliveryLocation,
      deliveryDate: load.deliveryDate,
      commodity: load.commodity || "",
      weightLbs: load.weightLbs ?? "",
      equipment: load.equipment || "",
      customerRate: Number(load.customerRate),
      carrierRate: Number(load.carrierRate),
      notes: load.notes || "",
      createdAt: load.createdAt,
    });
    row.getCell("pickupDate").numFmt = DATE_FORMAT;
    row.getCell("deliveryDate").numFmt = DATE_FORMAT;
    row.getCell("createdAt").numFmt = DATE_FORMAT;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface ParsedLoadRow {
  rowNumber: number;
  referenceNumber: string;
  status: string;
  customer: string;
  carrier: string;
  driver: string;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string;
  commodity: string;
  weightLbs: number | null;
  equipment: string;
  customerRate: number;
  carrierRate: number;
  notes: string;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in (value as any)) return String((value as any).text ?? "");
  if (typeof value === "object" && "result" in (value as any)) return String((value as any).result ?? "");
  return String(value).trim();
}

function cellToDateString(value: ExcelJS.CellValue): string {
  if (value instanceof Date) return value.toISOString();
  const asString = cellToString(value);
  if (!asString) return "";
  const parsed = new Date(asString);
  return Number.isNaN(parsed.getTime()) ? asString : parsed.toISOString();
}

function cellToNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(cellToString(value));
  return Number.isNaN(num) ? null : num;
}

export async function parseLoadsWorkbook(
  buffer: Buffer
): Promise<{ rows: ParsedLoadRow[]; error?: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) return { rows: [], error: "The file has no worksheets." };

  const headerRow = sheet.getRow(1);
  const headerToColumn = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const text = cellToString(cell.value).toLowerCase();
    if (text) headerToColumn.set(text, colNumber);
  });

  const columnIndex = new Map<string, number>();
  for (const col of COLUMNS) {
    const idx = headerToColumn.get(col.header.toLowerCase());
    if (idx) columnIndex.set(col.key, idx);
  }

  if (!columnIndex.has("pickupLocation") || !columnIndex.has("deliveryLocation")) {
    return {
      rows: [],
      error:
        "This doesn't look like a Haulwise loads export — expected columns like \"Pickup Location\" and \"Delivery Location\" were not found. Export the template first if you're building the file from scratch.",
    };
  }

  const get = (row: ExcelJS.Row, key: string) => {
    const idx = columnIndex.get(key);
    return idx ? row.getCell(idx).value : null;
  };

  const rows: ParsedLoadRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const pickupLocation = cellToString(get(row, "pickupLocation"));
    const deliveryLocation = cellToString(get(row, "deliveryLocation"));
    const referenceNumber = cellToString(get(row, "referenceNumber"));
    // Skip fully blank rows (common at the end of a spreadsheet).
    if (!pickupLocation && !deliveryLocation && !referenceNumber) return;

    rows.push({
      rowNumber,
      referenceNumber,
      status: cellToString(get(row, "status")).toUpperCase(),
      customer: cellToString(get(row, "customer")),
      carrier: cellToString(get(row, "carrier")),
      driver: cellToString(get(row, "driver")),
      pickupLocation,
      pickupDate: cellToDateString(get(row, "pickupDate")),
      deliveryLocation,
      deliveryDate: cellToDateString(get(row, "deliveryDate")),
      commodity: cellToString(get(row, "commodity")),
      weightLbs: cellToNumber(get(row, "weightLbs")),
      equipment: cellToString(get(row, "equipment")),
      customerRate: cellToNumber(get(row, "customerRate")) ?? 0,
      carrierRate: cellToNumber(get(row, "carrierRate")) ?? 0,
      notes: cellToString(get(row, "notes")),
    });
  });

  return { rows };
}
