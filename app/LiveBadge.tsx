"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LiveBadge({
  gameType = "regular",
  gameId,
  homeTeamName,
  awayTeamName,
  initialHomeScore,
  initialAwayScore,
  href,
}: {
  gameType?: "regular" | "playoff";
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHomeScore: number | null;
  initialAwayScore: number | null;
  href: string;
}) {
  const table = gameType === "regular" ? "games" : "playoff_games";
  const [homeScore, setHomeScore] = useState(initialHomeScore ?? 0);
  const [awayScore, setAwayScore] = useState(initialAwayScore ?? 0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-badge-${gameType}-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as { home_score: number | null; away_score: number | null };
          setHomeScore(row.home_score ?? 0);
          setAwayScore(row.away_score ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, gameType, table]);

  return (
    <Link
      href={href}
      className="block border border-red-500/40 bg-red-500/5 rounded-lg p-4 hover:border-red-500 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs uppercase tracking-wide text-red-400 font-semibold">
          En direct
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">
          {homeTeamName} vs {awayTeamName}
        </p>
        <p className="font-display text-lg text-bsh-gold whitespace-nowrap">
          {homeScore} - {awayScore}
        </p>
      </div>
    </Link>
  );
}
