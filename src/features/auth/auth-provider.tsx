"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; reason?: string }>({
    open: false,
  });
  const pending = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const isGuest = !!user?.is_anonymous;
  const hasAccount = !!user && !user.is_anonymous;

  // A code was accepted: close the dialog however it was opened, and let
  // any feature waiting on requireAccount() carry on.
  const onSignedIn = useCallback(() => {
    pending.current?.(true);
    pending.current = null;
    setDialog({ open: false });
  }, []);

  const ensureSession = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
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
