import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./SignOutButton";
import { isOwnerEmail } from "@/lib/adminAccess";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isOwner = isOwnerEmail(user.email);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-white/50">Connecté en tant que</p>
          <p className="font-semibold text-sm sm:text-base truncate">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
      <nav className="flex items-center gap-1.5 mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-white/10 text-xs sm:text-sm overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/admin"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
        >
          Matchs
        </Link>
        <Link
          href="/admin/demarrer"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-bsh-orange/10 text-bsh-orange font-semibold hover:opacity-80"
        >
          ● Démarrer
        </Link>
        <Link
          href="/admin/playoffs"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
        >
          Playoffs
        </Link>
        <Link
          href="/admin/historique"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
        >
          Historique
        </Link>
        {isOwner && (
          <Link
            href="/admin/changelog"
            className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
          >
            Mises à jour
          </Link>
        )}
        {isOwner && (
          <Link
            href="/admin/equipes"
            className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
          >
            Équipes
          </Link>
        )}
        {isOwner && (
          <Link
            href="/admin/social"
            className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
          >
            Réseaux sociaux
          </Link>
        )}
        {isOwner && (
          <Link
            href="/admin/sponsors"
            className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 text-white/60 hover:text-bsh-orange"
          >
            Sponsors
          </Link>
        )}
      </nav>
      {children}
    </div>
  );
}
