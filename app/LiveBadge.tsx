"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/app/Avatar";
import { shortTeamName } from "@/lib/teamDisplay";

export default function LiveBadge({
  gameType = "regular",
  gameId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
  initialHomeScore,
  initialAwayScore,
  href,
}: {
  gameType?: "regular" | "playoff";
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Avatar name={homeTeamName} src={homeTeamLogo} size={22} rounded="rounded" />
          <p className="font-semibold text-xs sm:text-sm truncate">
            <span className="sm:hidden">{shortTeamName(homeTeamName)}</span>
            <span className="hidden sm:inline">{homeTeamName}</span>
            {" vs "}
            <span className="sm:hidden">{shortTeamName(awayTeamName)}</span>
            <span className="hidden sm:inline">{awayTeamName}</span>
          </p>
          <Avatar name={awayTeamName} src={awayTeamLogo} size={22} rounded="rounded" />
        </div>
        <p className="font-display text-lg text-bsh-gold whitespace-nowrap shrink-0">
          {homeScore} - {awayScore}
        </p>
      </div>
    </Link>
  );
}
