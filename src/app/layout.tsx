import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter, Newsreader, Onest, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
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
    default: "Rello — resumes that fit the job",
    template: "%s · Rello",
  },
  description:
    "Build a clean, professional resume, then tailor a copy to any job line by line — you approve every change.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${onest.variable} ${newsreader.variable} ${docSerif.variable} ${docSans.variable} ${docPlex.variable}`}>
      <body className="min-h-dvh">
        <Toaster>
          <AuthProvider>{children}</AuthProvider>
        </Toaster>
      </body>
    </html>
  );
}
