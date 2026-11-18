"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { emailCodeError, isCodeRateLimit, requestEmailCode } from "./email-code";

// Must match Supabase → Auth → Providers → Email → "Email OTP length".
const CODE_LENGTH = 6;

type Step = { kind: "start" } | { kind: "code"; email: string; linking: boolean };

export function SignInDialog({
  open,
  reason,
  onOpenChange,
  onSignedIn,
  supabase,
  isGuest,
}: {
  open: boolean;
  reason?: string;
  onOpenChange: (open: boolean) => void;
  /** Called after a code is accepted; closes the dialog. */
  onSignedIn: () => void;
  supabase: SupabaseClient;
  isGuest: boolean;
}) {
  const [step, setStep] = useState<Step>({ kind: "start" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "code" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [cooldownEmail, setCooldownEmail] = useState("");
  const inFlight = useRef(false);
  const retryBlocked = resendIn > 0 && cooldownEmail === (step.kind === "code" ? step.email : email.trim());

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function reset() {
    setStep({ kind: "start" });
    setCode("");
    setError(null);
    setBusy(null);
  }

  async function continueWithGoogle() {
    setBusy("google");
    setError(null);
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(
      location.pathname + location.search,
    )}`;
    // A guest keeps their work by linking Google to the same user.
    const { error } = isGuest
      ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
      : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(null);
      setError("Google sign-in didn't start. Try again, or use your email.");
    }
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (inFlight.current || retryBlocked) return;
    const address = step.kind === "code" ? step.email : email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy("email");
    setError(null);
    inFlight.current = true;

    // If the email template sends a link instead of (or as well as) a code,
    // the link lands on our callback, which finishes signing in and comes
    // back here.
    const here = location.pathname === "/" ? "/resumes" : location.pathname + location.search;
    const emailRedirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(here)}`;

    try {
      const mode = step.kind === "code" ? (step.linking ? "resend-link" : "email") : (isGuest ? "guest" : "email");
      const linking = await requestEmailCode(supabase, address, emailRedirectTo, mode);
      setCode("");
      setCooldownEmail(address);
      setResendIn(60);
      setStep({ kind: "code", email: address, linking });
    } catch (failure) {
      if (isCodeRateLimit(failure)) {
        setCooldownEmail(address);
        setResendIn(60);
      }
      setError(emailCodeError(failure));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  async function verify(token: string) {
    if (step.kind !== "code" || inFlight.current) return;
    inFlight.current = true;
    setBusy("code");
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: step.email,
        token,
        type: step.linking ? "email_change" : "email",
      });
      if (error) throw error;
      if (!data.session) throw new Error("No sign-in session returned");
      toast.add({ title: "Signed in", description: step.email, type: "success" });
      reset();
      onSignedIn();
    } catch (failure) {
      setCode("");
      setError(emailCodeError(failure, true));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="gap-6 p-6 sm:max-w-[400px]">
        {step.kind === "start" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-medium tracking-tight">
                Sign in to Rello
              </DialogTitle>
              <DialogDescription>
                {reason ?? "Save your resumes and come back to them anywhere."}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full"
                onClick={continueWithGoogle}
                disabled={busy !== null}
              >
                {busy === "google" ? <Spinner data-icon="inline-start" /> : <GoogleMark />}
                Continue with Google
              </Button>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-popover">or</FieldSeparator>

              <form onSubmit={sendCode} className="contents">
                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error || undefined}
                    className="h-10"
                  />
                  {error ? (
                    <FieldError>{error}</FieldError>
                  ) : (
                    <FieldDescription>We&apos;ll email you a {CODE_LENGTH}-digit code.</FieldDescription>
                  )}
                </Field>
                <Button type="submit" size="lg" className="h-10 w-full" disabled={busy !== null || retryBlocked}>
                  {busy === "email" && <Spinner data-icon="inline-start" />}
                  {retryBlocked ? `Try again in ${resendIn}s` : "Email me a code"}
                </Button>
              </form>
            </FieldGroup>

            {isGuest && (
              <p className="text-xs text-muted-foreground">
                Anything you&apos;ve made as a guest stays with you after you sign in.
              </p>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-medium tracking-tight">
                Check your email
              </DialogTitle>
              <DialogDescription>
                Enter the code we sent to <span className="font-medium text-foreground">{step.email}</span>.
              </DialogDescription>
            </DialogHeader>

            <Field data-invalid={!!error || undefined} className="items-center">
              <FieldLabel htmlFor="signin-code" className="sr-only">
                Sign-in code
              </FieldLabel>
              <InputOTP
                id="signin-code"
                maxLength={CODE_LENGTH}
                value={code}
                onChange={setCode}
                onComplete={verify}
                disabled={busy !== null}
                autoFocus
                aria-invalid={!!error || undefined}
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && <FieldError>{error}</FieldError>}
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy !== null}>
                <ArrowLeftIcon data-icon="inline-start" />
                Use a different email
              </Button>
              <Button variant="ghost" size="sm" onClick={() => sendCode()} disabled={busy !== null || retryBlocked}>
                {busy === "email" && <Spinner data-icon="inline-start" />}
                {retryBlocked ? `Resend in ${resendIn}s` : "Resend code"}
              </Button>
              {busy === "code" && <Spinner aria-label="Verifying code" />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-icon="inline-start">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
