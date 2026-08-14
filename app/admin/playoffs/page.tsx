import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ROUND_LABELS: Record<string, string> = {
  demi_finale_1: "Demi-finale 1",
  demi_finale_2: "Demi-finale 2",
  petite_finale: "Petite finale",
  finale: "Finale",
};

export const dynamic = "force-dynamic";

export default async function AdminPlayoffsDashboard() {
  const supabase = await createClient();

  const { data: games } = await supabase
    .from("playoff_games")
    .select(
      "*, team_home:team_home_id(name), team_away:team_away_id(name)"
    )
    .order("game_date", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          MATCHS PLAYOFFS
        </h1>
        <Link
          href="/admin/playoffs/nouveau-match"
          className="bg-bsh-orange text-black font-bold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
        >
          + Nouveau match playoff
        </Link>
      </div>

      <Link
        href="/admin"
        className="text-sm text-white/50 hover:text-bsh-orange mb-6 inline-block"
      >
        ← Matchs saison régulière
      </Link>

      <div className="space-y-3">
        {games?.map((game) => (
          <Link
            key={game.id}
            href={`/admin/playoffs/match/${game.id}`}
            className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {game.team_home?.name ?? "?"} vs{" "}
                  {game.team_away?.name ?? "?"}
                </p>
                <p className="text-sm text-white/50">
                  {game.game_date} · {ROUND_LABELS[game.round] ?? game.round}{" "}
                  · Match {game.game_number}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-bsh-gold">
                  {game.home_score ?? "-"} / {game.away_score ?? "-"}
                </p>
                <p className="text-xs text-white/40 uppercase">
                  {game.status}
                </p>
              </div>
            </div>
          </Link>
        ))}
        {(!games || games.length === 0) && (
          <p className="text-white/50">Aucun match playoff pour le moment.</p>
        )}
      </div>
    </div>
  );
}
