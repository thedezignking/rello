import type { Metadata } from "next";
import { PrintView } from "@/features/pdf/print-view";

// Rendering target for PDF export. It holds no data of its own: the export
// route opens it in headless Chromium and hands it a resume to draw.
export const metadata: Metadata = {
  title: "Print",
  robots: { index: false, follow: false },
};

export default function PrintPage() {
  return <PrintView />;
}
