import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { BillingProvider } from "@/features/billing/billing-provider";
import { themeScript } from "@/features/theme/script";
import { ThemeSync } from "@/features/theme/theme-sync";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, Newsreader, Onest, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Resume template faces. Only downloaded when a template uses them.
const docSerif = Source_Serif_4({
  variable: "--font-doc-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});
const docSans = Inter({ variable: "--font-doc-sans", subsets: ["latin"] });
const docPlex = IBM_Plex_Sans({
  variable: "--font-doc-plex",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Rello — Resumes that fit the job",
    template: "Rello — %s",
  },
  description:
    "Make one clean resume, then tailor a copy to each job, line by line. You approve every change.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      style={{ colorScheme: "only light", backgroundColor: "#f8f9f6" }}
      className={`${onest.variable} ${newsreader.variable} ${docSerif.variable} ${docSans.variable} ${docPlex.variable}`}
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded focus:bg-card focus:p-3 focus:text-foreground"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <ThemeSync />
        </Suspense>
        <Toaster>
          <AuthProvider>
            <BillingProvider>{children}</BillingProvider>
          </AuthProvider>
        </Toaster>
      </body>
    </html>
  );
}
