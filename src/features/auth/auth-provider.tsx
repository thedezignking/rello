"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { downloadRecovery } from "@/features/resumes/recovery";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { finishGuestTransfer, GUEST_BACKUP } from "./guest-transfer";
import { SignInDialog } from "./sign-in-dialog";

type AuthState = {
  /** null until the first session check finishes. */
  user: User | null;
  ready: boolean;
  /** Signed in as a guest (anonymous Supabase user). */
  isGuest: boolean;
  /** Signed in with Google or email. */
  hasAccount: boolean;
  /** Makes sure there's a session, starting a guest one if needed. */
  ensureSession: () => Promise<User>;
  /**
   * Resolves once the person has a real account. Opens the sign-in dialog
   * when they don't. Resolves false if they close it.
   */
  requireAccount: (reason?: string) => Promise<boolean>;
  openSignIn: (reason?: string) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) return <RemoteAuthProvider>{children}</RemoteAuthProvider>;
  const unavailable = () => {
    toast.add({
      title: "Sign-in isn't configured",
      description: "This development workspace keeps resumes in this browser.",
      type: "info",
    });
  };
  return (
    <AuthContext
      value={{
        user: null,
        ready: true,
        isGuest: false,
        hasAccount: false,
        ensureSession: async () => {
          throw Error("Local workspace");
        },
        requireAccount: async () => {
          unavailable();
          return false;
        },
        openSignIn: unavailable,
        signOut: async () => {},
      }}
    >
      {children}
    </AuthContext>
  );
}

function RemoteAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; reason?: string }>({
    open: false,
  });
  const pending = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    let sequence = 0;
    let active = true;
    const apply = (next: User | null) => {
      const request = ++sequence;
      setUser(next);
      if (!next || next.is_anonymous) {
        setReady(true);
        return;
      }
      setReady(false);
      // Run outside Supabase's auth callback lock.
      setTimeout(() => {
        void finishGuestTransfer()
          .then(() => {
            if (active && request === sequence) setTransferError(null);
          })
          .catch((error: unknown) => {
            if (active && request === sequence)
              setTransferError(
                error instanceof Error
                  ? error.message
                  : "Guest recovery didn't finish. Your recovery copy has been kept.",
              );
          })
          .finally(() => {
            if (active && request === sequence) setReady(true);
          });
      }, 0);
    };
    const initialRequest = sequence;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active && sequence === initialRequest) apply(data.user);
      })
      .catch(() => {
        if (active && sequence === initialRequest) setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => {
      active = false;
      sequence++;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const isGuest = !!user?.is_anonymous;
  const hasAccount = ready && !!user && !user.is_anonymous;

  // A code was accepted: close the dialog however it was opened, and let
  // any feature waiting on requireAccount() carry on.
  const onSignedIn = useCallback(async () => {
    setDialog({ open: false });
    try {
      await finishGuestTransfer();
      setTransferError(null);
      pending.current?.(true);
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : "Guest recovery didn't finish. Download your recovery copy or try again.",
      );
      pending.current?.(false);
    } finally {
      pending.current = null;
    }
  }, []);

  const ensureSession = useCallback(async () => {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") throw authError;
    if (data.user) return data.user;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) throw error ?? new Error("Couldn't start a session");
    return anon.user;
  }, [supabase]);

  const openSignIn = useCallback((reason?: string) => {
    setDialog({ open: true, reason });
  }, []);

  const requireAccount = useCallback(
    (reason?: string) => {
      if (hasAccount) return Promise.resolve(true);
      pending.current?.(false);
      return new Promise<boolean>((resolve) => {
        pending.current = resolve;
        setDialog({ open: true, reason });
      });
    },
    [hasAccount],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const onDialogChange = useCallback((open: boolean) => {
    setDialog((d) => ({ ...d, open }));
    if (!open && pending.current) {
      pending.current(false);
      pending.current = null;
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      isGuest,
      hasAccount,
      ensureSession,
      requireAccount,
      openSignIn,
      signOut,
    }),
    [user, ready, isGuest, hasAccount, ensureSession, requireAccount, openSignIn, signOut],
  );

  return (
    <AuthContext value={value}>
      {transferError && (
        <Alert variant="destructive">
          <AlertTitle>Guest recovery needs attention</AlertTitle>
          <AlertDescription>{transferError}</AlertDescription>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void finishGuestTransfer()
                  .then(() => location.reload())
                  .catch(() => {});
              }}
            >
              Try recovery again
            </Button>
            <Button variant="outline" onClick={() => downloadRecovery(sessionStorage.getItem(GUEST_BACKUP))}>
              Download guest recovery copy
            </Button>
          </div>
        </Alert>
      )}
      {children}
      <SignInDialog
        open={dialog.open}
        reason={dialog.reason}
        onOpenChange={onDialogChange}
        onSignedIn={onSignedIn}
        supabase={supabase}
        isGuest={isGuest}
      />
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
