"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { downloadRecovery } from "./recovery";

export function DraftNotice({
  value,
  status,
  recovered,
  storageFailed,
  rawRecovery,
  discardDraft,
  undo,
  canUndo,
}: {
  value: unknown;
  status: string;
  recovered: boolean;
  storageFailed: boolean;
  rawRecovery: string | null;
  discardDraft: () => void;
  undo: () => void;
  canUndo: boolean;
}) {
  return (
    <>
      {(status === "conflict" || recovered || storageFailed) && (
        <Alert
          id="draft-recovery"
          variant={status === "conflict" || storageFailed ? "destructive" : "default"}
          className="shrink-0 rounded-none"
        >
          <AlertTitle>
            {status === "conflict"
              ? "Your draft needs review"
              : storageFailed
                ? "Couldn't keep a recovery draft"
                : "Recovered changes from this tab"}
          </AlertTitle>
          <AlertDescription>
            {status === "conflict"
              ? "The stored version changed, so your draft hasn't overwritten it. Download your draft before discarding it and loading the stored version."
              : storageFailed
                ? "Keep this page open until saving succeeds, or download a recovery copy."
                : "Your recovered changes are being saved. Check the save status before leaving."}
          </AlertDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadRecovery(rawRecovery ?? value)}>
              Download draft
            </Button>
            {status === "conflict" && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                  Discard draft and reload
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard your unsaved draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Download a copy first if you want to keep it. This will load the version currently
                      stored in your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep draft</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={discardDraft}>
                      Discard draft and reload
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Alert>
      )}
      {canUndo && (
        <div className="shrink-0 border-b bg-card px-4 py-1">
          <Button size="sm" variant="ghost" onClick={undo}>
            Undo last edit
          </Button>
        </div>
      )}
    </>
  );
}
