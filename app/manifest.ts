import type { MetadataRoute } from "next";

// Web App Manifest — makes BSH installable ("Ajouter à l'écran d'accueil")
// on Android/iOS/desktop from the browser, no app store needed. This is the
// "demo, tous appareils" version: same Next.js app, just app-ifiée.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BSH | BallSoHard",
    short_name: "BSH",
    description:
      "La plateforme de stats basketball multi-ligues en Haïti — AHBB, SUBLE et plus à venir.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0D0D0D",
    theme_color: "#0D0D0D",
    lang: "fr-HT",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
