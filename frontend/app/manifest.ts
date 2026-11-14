import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tyyni — Calming Somatic Sanctuary",
    short_name: "Tyyni",
    description:
      "A gentle nervous-system companion for daily grounding, quiet micro-victories, and somatic anchors.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf9f6",
    theme_color: "#fbf9f6",
    categories: ["health", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "1-Tap SOS Breathing",
        short_name: "SOS Calm",
        description: "Immediate gentle physiological sigh pacer",
        url: "/ground?sos=1",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Ground Yourself",
        short_name: "Ground",
        description: "Breathing, Sound Sanctuary, and body scan practices",
        url: "/ground",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Sensory Anchor",
        short_name: "Anchor",
        description: "5–4–3–2–1 sensory reset and personal anchors",
        url: "/anchor",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
