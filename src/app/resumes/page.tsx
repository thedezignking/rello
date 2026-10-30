import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { HomeView } from "@/features/home/home-view";

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
