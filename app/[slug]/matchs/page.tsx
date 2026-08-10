import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function MatchsPage({
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

  const { data: games } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name)"
    )
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl text-bsh-orange mb-2 tracking-wide">
        {league.name}
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-10">
        <Link href={`/${slug}`} className="hover:text-bsh-orange">
          Équipes
        </Link>
        <span className="text-bsh-gold font-semibold">Matchs</span>
        <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
          Classement
        </Link>
      </div>

      <div className="space-y-3">
        {games?.map((game) => (
          <Link
            key={game.id}
            href={`/${slug}/match/${game.id}`}
            className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {game.home_team?.name ?? "?"} vs{" "}
                  {game.away_team?.name ?? "?"}
                </p>
                <p className="text-sm text-white/50">
                  {game.game_date} · {game.phase ?? "Saison régulière"}
                </p>
              </div>
              <div className="text-right">
                {game.status === "completed" ? (
                  <p className="font-display text-lg text-bsh-gold">
                    {game.home_score} - {game.away_score}
                  </p>
                ) : (
                  <p className="text-xs text-white/40 uppercase">
                    À venir
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
        {(!games || games.length === 0) && (
          <p className="text-white/50">Aucun match pour le moment.</p>
        )}
      </div>
    </div>
  );
}
