import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!league) notFound();

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", league.id)
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl text-bsh-orange mb-2 tracking-wide">
        {league.name}
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-10">
        <span className="text-bsh-gold font-semibold">Équipes</span>
        <Link href={`/${slug}/matchs`} className="hover:text-bsh-orange">
          Matchs
        </Link>
      </div>

      <h2 className="font-display text-xl text-bsh-gold mb-4 tracking-wide">
        ÉQUIPES
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams?.map((team) => (
          <Link
            key={team.id}
            href={`/${slug}/equipe/${team.id}`}
            className="border border-white/10 rounded-lg p-6 hover:border-bsh-orange transition-colors bg-white/5"
          >
            <h3 className="font-display text-lg">{team.name}</h3>
          </Link>
        ))}
        {(!teams || teams.length === 0) && (
          <p className="text-white/50">Aucune équipe pour le moment.</p>
        )}
      </div>
    </div>
  );
}
