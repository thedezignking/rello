"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon, Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/features/auth/auth-provider";
import { useTheme, type ThemeChoice } from "@/features/theme/theme";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SettingsView() {
  const { ready, user, hasAccount, isGuest, openSignIn, signOut } = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Settings</h1>

      {!ready ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : hasAccount && user ? (
        <AccountCard
          key={user.id}
          email={user.email ?? ""}
          name={(user.user_metadata?.full_name as string | undefined) ?? ""}
          provider={(user.app_metadata?.provider as string | undefined) ?? "email"}
          onSignOut={signOut}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{isGuest ? "You're using Rello as a guest" : "You're not signed in"}</CardTitle>
            <CardDescription>
              {isGuest
                ? "Your resumes are saved in this browser only. Sign in to keep them safe and open them on any device."
                : "Sign in to save your resumes and come back to them anywhere."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => openSignIn()}>Sign in</Button>
          </CardFooter>
        </Card>
      )}

      <AppearanceCard />

      <DeleteCard hasData={hasAccount || isGuest || !isSupabaseConfigured()} isGuest={isGuest} />
    </main>
  );
}

function AccountCard({
  email,
  name: initialName,
  provider,
  onSignOut,
}: {
  email: string;
  name: string;
  provider: string;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    toast.add(
      error
        ? { title: "Couldn't save your name", description: "Try again in a moment.", type: "error" }
        : { title: "Name saved", type: "success" },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Signed in with {provider === "google" ? "Google" : "an email code"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveName} id="account-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-name">Name</FieldLabel>
              <Input id="settings-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-email">Email</FieldLabel>
              <Input id="settings-email" value={email} readOnly disabled />
              <FieldDescription>This is where your sign-in codes go.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <Button variant="ghost" onClick={onSignOut}>
          <LogOutIcon data-icon="inline-start" />
          Sign out
        </Button>
        <Button type="submit" form="account-form" disabled={saving || name.trim() === initialName}>
          {saving && <Spinner data-icon="inline-start" />}
          Save name
        </Button>
      </CardFooter>
    </Card>
  );
}

const THEMES: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>System follows your device. Resume pages always stay white, like paper.</CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          value={[theme]}
          onValueChange={(v) => v[0] && setTheme(v[0] as ThemeChoice)}
          variant="outline"
          aria-label="Theme"
        >
          {THEMES.map(({ value, label, Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              className="gap-1.5 px-3 data-pressed:border-primary/40 data-pressed:bg-accent data-pressed:text-accent-foreground"
            >
              <Icon data-icon="inline-start" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}

function DeleteCard({ hasData, isGuest }: { hasData: boolean; isGuest: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      toast.add({
        title: "Couldn't delete",
        description: data?.error?.message ?? "Check your connection and try again. Nothing was removed.",
        type: "error",
      });
      return;
    }
    // Clear anything kept in this browser too.
    for (const key of Object.keys(localStorage)) if (key.startsWith("rello.")) localStorage.removeItem(key);
    sessionStorage.removeItem("rello.import");
    await createClient().auth.signOut().catch(() => {});
    toast.add({ title: "Everything's deleted", description: "Your account and resumes are gone.", type: "success" });
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>{isGuest ? "Delete your data" : "Delete account"}</CardTitle>
        <CardDescription>
          Permanently removes {isGuest ? "your guest session" : "your account"}, every resume, tailored copy and saved
          job description. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={!hasData}>
          <Trash2Icon data-icon="inline-start" />
          {isGuest ? "Delete my data" : "Delete account and data"}
        </Button>
      </CardFooter>

      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete everything?</AlertDialogTitle>
            <AlertDialogDescription>
              All your resumes and tailored copies will be deleted for good. Download any PDFs you want to keep first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              Delete everything
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
