import type { Metadata } from "next";
import { ImportReview } from "@/features/import/import-review";

export const metadata: Metadata = { title: "Check your import" };

export default function ImportPage() {
  return <ImportReview />;
}
