import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdfBuffer(doc: ReactElement<DocumentProps>) {
  const buffer = await renderToBuffer(doc);
  return buffer;
}
