import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, Newsreader, Onest, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { themeScript } from "@/features/theme/script";
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
const docSerif = Source_Serif_4({ variable: "--font-doc-serif", subsets: ["latin"], style: ["normal", "italic"] });
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
      className={`${onest.variable} ${newsreader.variable} ${docSerif.variable} ${docSans.variable} ${docPlex.variable}`}
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Toaster>
          <AuthProvider>{children}</AuthProvider>
        </Toaster>
      </body>
    </html>
  );
}
