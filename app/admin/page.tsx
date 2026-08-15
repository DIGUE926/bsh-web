import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DeleteGameButton from "./DeleteGameButton";
import QuickStartButton from "./QuickStartButton";
import LiveKillSwitch from "./LiveKillSwitch";
import { isLiveScoringEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const liveEnabled = await isLiveScoringEnabled();

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

      <LiveKillSwitch initialEnabled={liveEnabled} />

      <div className="space-y-3">
        {games?.map((game) => (
          <div
            key={game.id}
            className="relative block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
          >
            <Link
              href={
                liveEnabled
                  ? `/admin/match/${game.id}/live`
                  : `/admin/match/${game.id}`
              }
              className="absolute inset-0"
              aria-label={`${liveEnabled ? "Enregistrer" : "Corriger"} ${game.home_team?.name ?? "?"} vs ${game.away_team?.name ?? "?"}`}
            />
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
              <div className="relative z-10 flex items-center gap-2">
                <div className="text-right">
                  <p className="font-display text-lg text-bsh-gold">
                    {game.home_score ?? "-"} / {game.away_score ?? "-"}
                  </p>
                  <p className="text-xs text-white/40 uppercase">
                    {game.status}
                  </p>
                </div>
                <Link
                  href={`/admin/match/${game.id}`}
                  className="relative z-10 text-xs bg-white/10 text-white/70 rounded px-2 py-1 hover:bg-white/20"
                >
                  Corriger
                </Link>
                {game.status === "scheduled" && (
                  <QuickStartButton gameId={game.id} disabled={!liveEnabled} />
                )}
                <DeleteGameButton gameId={game.id} />
              </div>
            </div>
          </div>
        ))}
        {(!games || games.length === 0) && (
          <p className="text-white/50">Aucun match pour le moment.</p>
        )}
      </div>
    </div>
  );
}
