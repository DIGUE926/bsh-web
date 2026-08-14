import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-white/50">Connecté en tant que</p>
          <p className="font-semibold">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
      <nav className="flex items-center gap-4 mb-8 pb-4 border-b border-white/10 text-sm">
        <Link href="/admin" className="text-white/60 hover:text-bsh-orange">
          Matchs
        </Link>
        <Link
          href="/admin/playoffs"
          className="text-white/60 hover:text-bsh-orange"
        >
          Playoffs
        </Link>
        <Link
          href="/admin/historique"
          className="text-white/60 hover:text-bsh-orange"
        >
          Historique des modifs
        </Link>
        <Link
          href="/admin/changelog"
          className="text-white/60 hover:text-bsh-orange"
        >
          Mises à jour du site
        </Link>
      </nav>
      {children}
    </div>
  );
}
