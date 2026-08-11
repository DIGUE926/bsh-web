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
    .select("name, slug")
    .order("name");

  return (
    <html lang="fr">
      <body className="antialiased min-h-screen flex flex-col">
        <NavMenu leagues={leagues ?? []} />
        <BackButton />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-sm text-white/40">
          BSH | BallSoHard
        </footer>
      </body>
    </html>
  );
}
