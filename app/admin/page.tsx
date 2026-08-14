import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DeleteGameButton from "./DeleteGameButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: games } = await supabase
    .from("games")
    .select("*, home_team:home_team_id(name), away_team:away_team_id(name)")
    .order("game_date", { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          MATCHS
        </h1>
        <Link
          href="/admin/nouveau-match"
          className="bg-bsh-orange text-black font-bold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
        >
          + Nouveau match
        </Link>
      </div>

      <Link
        href="/admin/playoffs"
        className="text-sm text-bsh-gold hover:underline mb-6 inline-block"
      >
        → Gérer les matchs playoffs
      </Link>

      <div className="space-y-3">
        {games?.map((game) => (
          <Link
            key={game.id}
            href={`/admin/match/${game.id}`}
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
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-display text-lg text-bsh-gold">
                    {game.home_score ?? "-"} / {game.away_score ?? "-"}
                  </p>
                  <p className="text-xs text-white/40 uppercase">
                    {game.status}
                  </p>
                </div>
                <DeleteGameButton gameId={game.id} />
              </div>
            </div>
          </Link>
        ))}
        {(!games || games.length === 0) && (
          <p className="text-white/50">Aucun match pour le moment.</p>
        )}
      </div>

      <div className="mt-10 pt-4 border-t border-white/5">
        <Link
          href="/admin/historique"
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Historique des modifications
        </Link>
      </div>
    </div>
  );
}
