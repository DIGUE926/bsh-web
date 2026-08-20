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
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name), league:league_id(slug)"
    )
    .order("game_date", { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="font-display text-lg sm:text-xl text-bsh-orange tracking-wide">
          MATCHS
        </h1>
        <Link
          href="/admin/nouveau-match"
          className="bg-bsh-orange text-black font-bold rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-sm hover:opacity-90 transition-opacity shrink-0"
        >
          + Nouveau match
        </Link>
      </div>

      <LiveKillSwitch initialEnabled={liveEnabled} />

      <div className="space-y-3">
        {games?.map((game) => (
          <div
            key={game.id}
            className="relative block border border-white/10 rounded-lg p-3 sm:p-4 hover:border-bsh-orange transition-colors bg-white/5"
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {game.league?.slug && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-bsh-orange bg-bsh-orange/10 rounded px-1.5 py-0.5">
                      {game.league.slug}
                    </span>
                  )}
                  <p className="font-semibold text-sm sm:text-base truncate">
                    {game.home_team?.name ?? "?"} vs{" "}
                    {game.away_team?.name ?? "?"}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-white/50">
                  {game.game_date} · {game.phase ?? "Saison régulière"}
                </p>
              </div>
              <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2">
                <div className="sm:text-right">
                  <p className="font-display text-base sm:text-lg text-bsh-gold">
                    {game.home_score ?? "-"} / {game.away_score ?? "-"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/40 uppercase">
                    {game.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
          </div>
        ))}
        {(!games || games.length === 0) && (
          <p className="text-white/50">Aucun match pour le moment.</p>
        )}
      </div>
    </div>
  );
}
