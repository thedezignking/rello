import { ImportReview } from "@/features/import/import-review";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your import" };

export default function ImportPage() {
  return <ImportReview />;
}
