import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { HomeView } from "@/features/home/home-view";

export default function HomePage() {
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
