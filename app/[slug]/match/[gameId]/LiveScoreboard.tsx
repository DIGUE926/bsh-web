"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CourtDiagram, { ShotPoint } from "@/app/CourtDiagram";

type GameState = {
  home_score: number | null;
  away_score: number | null;
  status: string;
  current_period: number | null;
  clock_display: string | null;
};

export default function LiveScoreboard({
  gameId,
  homeTeamName,
  awayTeamName,
  initialGame,
  initialShots,
}: {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialGame: GameState;
  initialShots: ShotPoint[];
}) {
  const [game, setGame] = useState<GameState>(initialGame);
  const [shots, setShots] = useState<ShotPoint[]>(initialShots);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as GameState)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shot_events", filter: `game_id=eq.${gameId}` },
        (payload) => setShots((prev) => [...prev, payload.new as ShotPoint])
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "shot_events", filter: `game_id=eq.${gameId}` },
        () => {
          // Un tir a été annulé côté admin — on recharge la liste complète pour rester synchro
          supabase
            .from("shot_events")
            .select("x,y,made,shot_type")
            .eq("game_id", gameId)
            .then(({ data }) => setShots((data as ShotPoint[]) ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  if (game.status !== "live") return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs uppercase tracking-wide text-red-400 font-semibold">
          En direct — Période {game.current_period ?? 1}
          {game.clock_display ? ` · ${game.clock_display}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-white/10 rounded-lg p-4 text-center bg-white/5">
          <p className="text-sm text-white/60 mb-1">{homeTeamName}</p>
          <p className="font-display text-4xl text-bsh-gold">{game.home_score ?? 0}</p>
        </div>
        <div className="border border-white/10 rounded-lg p-4 text-center bg-white/5">
          <p className="text-sm text-white/60 mb-1">{awayTeamName}</p>
          <p className="font-display text-4xl text-bsh-gold">{game.away_score ?? 0}</p>
        </div>
      </div>

      <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Shot chart</p>
      <div className="max-w-md">
        <CourtDiagram shots={shots} />
      </div>
    </div>
  );
}
