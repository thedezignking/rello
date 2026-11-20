import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { SettingsView } from "@/features/settings/settings-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <SettingsView />
      <SiteFooter />
    </>
  );
}
