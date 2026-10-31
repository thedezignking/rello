"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { IMPORT_KEY, type PendingImport } from "./pending";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** `tile` renders as a page-shaped card for the "Start a new resume" strip. */
export function ImportButton({ variant = "button" }: { variant?: "button" | "tile" }) {
  const router = useRouter();
  const { ensureSession } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<string | null>(null);

  async function upload(file: File) {
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.add({ title: "That file type isn't supported", description: "Choose a PDF or DOCX file.", type: "error" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.add({ title: "That file is too large", description: "Choose a file under 5 MB.", type: "error" });
      return;
    }

    setReading(file.name);
    try {
      if (isSupabaseConfigured()) await ensureSession();
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.add({
          title: "Import didn't work",
          description: data?.error?.message ?? "We couldn't read this file. Try a text-based PDF or DOCX.",
          type: "error",
        });
        return;
      }
      const pending: PendingImport = data;
      sessionStorage.setItem(IMPORT_KEY, JSON.stringify(pending));
      router.push("/import");
    } catch {
      toast.add({ title: "Import didn't work", description: "Check your connection and try again.", type: "error" });
    } finally {
      setReading(null);
    }
  }

  return (
    <>
      {variant === "tile" ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!!reading}
          className="group flex w-full flex-col gap-2 rounded-lg text-left outline-none"
        >
          <span className="flex aspect-[794/1123] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card/50 text-muted-foreground transition-[border-color,color] duration-200 ease-(--ease-out) group-focus-visible:ring-3 group-focus-visible:ring-ring/50 [@media(hover:hover)]:group-hover:border-primary [@media(hover:hover)]:group-hover:text-primary">
            <UploadIcon className="size-6" strokeWidth={1.5} />
            <span className="px-3 text-center text-xs">PDF or Word</span>
          </span>
          <span className="text-sm font-medium">Import</span>
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={!!reading}>
          <UploadIcon data-icon="inline-start" />
          Import PDF or DOCX
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        // Opened only from the button above, so it needn't take up space. (As
        // sr-only it was placed outside the scrolling tile strip and widened the
        // whole page on phones.)
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Dialog open={!!reading}>
        <DialogContent showCloseButton={false} className="items-center text-center sm:max-w-xs">
          <DialogHeader className="items-center">
            <Spinner className="size-6 text-primary" />
            <DialogTitle>Reading your resume…</DialogTitle>
            <DialogDescription>
              Pulling the details out of {reading}. This usually takes 10 to 30 seconds.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
