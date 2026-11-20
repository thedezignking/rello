import { Editor, EditorSkeleton } from "@/features/editor/editor";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Edit resume" };

export default function ResumePage({ params }: PageProps<"/r/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      {params.then(({ id }) => (
        <Editor id={id} />
      ))}
    </Suspense>
  );
}
