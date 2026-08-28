import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import BackButton from "./BackButton";
import NavMenu from "./NavMenu";
import { supabase } from "@/lib/supabase";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import InstallPrompt from "./InstallPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://bsh-web-one.vercel.app"),
  title: "BSH | BallSoHard",
  description: "La plateforme de stats basketball multi-ligues en Haïti, avec l'AHBB, la SUBLE et plus à venir.",
  openGraph: {
    title: "BSH | BallSoHard",
    description: "La plateforme de stats basketball multi-ligues en Haïti, avec l'AHBB, la SUBLE et plus à venir.",
    url: "https://bsh-web-one.vercel.app",
    siteName: "BSH",
    locale: "fr_HT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BSH | BallSoHard",
    description: "La plateforme de stats basketball multi-ligues en Haïti, avec l'AHBB, la SUBLE et plus à venir.",
  },
  // PWA: rend l'app installable ("Ajouter à l'écran d'accueil") sur
  // iOS/Android/desktop sans passer par l'App Store / Play Store.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BSH",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: leagues } = await supabase
    .from("leagues")
    .select("name, slug, logo_url")
    .order("name");

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <NavMenu leagues={leagues ?? []} />
        <BackButton />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 pt-4 pb-6 text-center text-sm text-white/40">
          <p className="mb-3">BSH | BallSoHard</p>
          <a
            href="https://www.instagram.com/ballsohardx2/?__pwa=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-bsh-orange transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            <span>@ballsohardx2</span>
          </a>
        </footer>
        <Analytics />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
