import type { Metadata } from "next";
import "./globals.css";
import BackButton from "./BackButton";
import NavMenu from "./NavMenu";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  metadataBase: new URL("https://bsh-web-one.vercel.app"),
  title: "BSH | BallSoHard",
  description: "La plateforme de stats basketball multi-ligues en Haïti, avec l'AHBB, la SUBLE et plus à venir.",
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
      </body>
    </html>
  );
}
