import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BSH | Basketball Stats Haïti",
  description: "La plateforme de stats basketball multi-ligues en Haïti — AHBB, SUBLE et plus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen flex flex-col">
        <nav className="border-b border-white/10 bg-bsh-black sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="font-display text-2xl text-bsh-orange tracking-wide">
              BSH
            </a>
            <div className="flex gap-6 text-sm font-semibold">
              <a href="/suble" className="hover:text-bsh-orange transition-colors">SUBLE</a>
              <a href="/classement" className="hover:text-bsh-orange transition-colors">Classement Global</a>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-sm text-white/40">
          BSH — Basketball Stats Haïti
        </footer>
      </body>
    </html>
  );
}
