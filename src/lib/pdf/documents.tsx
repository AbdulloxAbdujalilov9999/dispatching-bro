import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700, color: "#2249d6" },
  brandSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  docMeta: { fontSize: 9, color: "#64748b", textAlign: "right", marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: "#64748b" },
  value: { flex: 1, fontWeight: 500 },
  twoCol: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#e4e8f0", borderRadius: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f6f8fb",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8f0",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" },
  amountBox: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: 220,
    borderTopWidth: 2,
    borderTopColor: "#0f172a",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLabel: { fontSize: 11, fontWeight: 700 },
  amountValue: { fontSize: 14, fontWeight: 700, color: "#2249d6" },
  terms: { marginTop: 24, fontSize: 8.5, color: "#475569", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center" },
  signatureRow: { flexDirection: "row", marginTop: 40, gap: 40 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#0f172a", paddingTop: 6, fontSize: 8, color: "#64748b" },
});

function money(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateStr(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export interface RateConfirmationPdfData {
  rcNumber: string;
  status: string;
  createdAt: Date | string;
  rateAmount: number | string;
  terms?: string | null;
  carrier: {
    name: string;
    mcNumber?: string | null;
    dotNumber?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  load: {
    referenceNumber: string;
    pickupLocation: string;
    pickupDate: Date | string;
    deliveryLocation: string;
    deliveryDate: Date | string;
    commodity?: string | null;
    weightLbs?: number | null;
    equipment?: string | null;
  };
}

export function RateConfirmationDocument({ data }: { data: RateConfirmationPdfData }) {
  return (
    <Document title={`Rate Confirmation ${data.rcNumber}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Haulwise Dispatch</Text>
            <Text style={styles.brandSub}>Freight Brokerage & Dispatch Services</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>RATE CONFIRMATION</Text>
            <Text style={styles.docMeta}>{data.rcNumber}</Text>
            <Text style={styles.docMeta}>{dateStr(data.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Carrier</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{data.carrier.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MC / DOT</Text>
              <Text style={styles.value}>
                {data.carrier.mcNumber || "—"} / {data.carrier.dotNumber || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact</Text>
              <Text style={styles.value}>{data.carrier.contactName || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Phone / Email</Text>
              <Text style={styles.value}>
                {data.carrier.phone || "—"} / {data.carrier.email || "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Load</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Reference #</Text>
              <Text style={styles.value}>{data.load.referenceNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Equipment</Text>
              <Text style={styles.value}>{data.load.equipment || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Commodity</Text>
              <Text style={styles.value}>{data.load.commodity || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Weight</Text>
              <Text style={styles.value}>{data.load.weightLbs ? `${data.load.weightLbs.toLocaleString()} lbs` : "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Stop</Text>
            <Text style={[styles.th, { flex: 2 }]}>Location</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ flex: 2 }}>Pickup</Text>
            <Text style={{ flex: 2 }}>{data.load.pickupLocation}</Text>
            <Text style={{ flex: 1.2 }}>{dateStr(data.load.pickupDate)}</Text>
          </View>
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: "#e4e8f0" }]}>
            <Text style={{ flex: 2 }}>Delivery</Text>
            <Text style={{ flex: 2 }}>{data.load.deliveryLocation}</Text>
            <Text style={{ flex: 1.2 }}>{dateStr(data.load.deliveryDate)}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Agreed Rate</Text>
          <Text style={styles.amountValue}>{money(data.rateAmount)}</Text>
        </View>

        <Text style={styles.terms}>
          {data.terms ||
            "Carrier agrees to transport the above load at the rate stated. Rate includes all fuel, accessorials, " +
              "and detention unless otherwise noted. A signed Bill of Lading and this signed Rate Confirmation are " +
              "required prior to payment. Carrier must notify broker immediately of any delays or issues affecting delivery."}
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text>Broker Signature — Haulwise Dispatch</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Carrier Signature — {data.carrier.name}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Haulwise Dispatch • This document is a legally binding rate agreement once signed by both parties.</Text>
      </Page>
    </Document>
  );
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  amount: number | string;
  notes?: string | null;
  customer: {
    name: string;
    contactName?: string | null;
    addressLine?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    email?: string | null;
  };
  load: {
    referenceNumber: string;
    pickupLocation: string;
    pickupDate: Date | string;
    deliveryLocation: string;
    deliveryDate: Date | string;
  };
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Haulwise Dispatch</Text>
            <Text style={styles.brandSub}>Freight Brokerage & Dispatch Services</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>INVOICE</Text>
            <Text style={styles.docMeta}>{data.invoiceNumber}</Text>
            <Text style={styles.docMeta}>Issued {dateStr(data.createdAt)}</Text>
            {data.dueDate && <Text style={styles.docMeta}>Due {dateStr(data.dueDate)}</Text>}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{data.customer.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact</Text>
              <Text style={styles.value}>{data.customer.contactName || "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>
                {[data.customer.addressLine, data.customer.city, data.customer.state, data.customer.zip]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{data.customer.email || "—"}</Text>
            </View>
          </View>

          <View style={[styles.col, styles.section]}>
            <Text style={styles.sectionTitle}>Shipment</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Load #</Text>
              <Text style={styles.value}>{data.load.referenceNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pickup</Text>
              <Text style={styles.value}>
                {data.load.pickupLocation} — {dateStr(data.load.pickupDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Delivery</Text>
              <Text style={styles.value}>
                {data.load.deliveryLocation} — {dateStr(data.load.deliveryDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ flex: 3 }}>Freight transportation services — Load {data.load.referenceNumber}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{money(data.amount)}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Due</Text>
          <Text style={styles.amountValue}>{money(data.amount)}</Text>
        </View>

        {data.notes && <Text style={styles.terms}>{data.notes}</Text>}

        <Text style={styles.footer}>Haulwise Dispatch • Please remit payment by the due date referencing the invoice number above.</Text>
      </Page>
    </Document>
  );
}
