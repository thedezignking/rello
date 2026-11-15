import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rello — Resumes that fit the job",
    short_name: "Rello",
    description: "Build a clean resume, then tailor a copy to any job line by line.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9f6",
    theme_color: "#f8f9f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
