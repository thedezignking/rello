import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { HomeView } from "@/features/home/home-view";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Your resumes" };

export default function ResumesPage() {
  return (
    <>
      <AppHeader />
      <HomeView />
      <SiteFooter />
      <Suspense>
        <AuthNotice />
      </Suspense>
    </>
  );
}
