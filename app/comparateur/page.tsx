"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PlayerAutocomplete, { type PlayerStats } from "./PlayerAutocomplete";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const RADAR_STATS: { key: "ppg" | "rpg" | "apg" | "spg" | "bpg"; label: string }[] = [
  { key: "ppg", label: "PTS" },
  { key: "rpg", label: "REB" },
  { key: "apg", label: "AST" },
  { key: "spg", label: "STL" },
  { key: "bpg", label: "BLK" },
];

const TABLE_STATS: { key: keyof PlayerStats; label: string; suffix?: string }[] = [
  { key: "ppg", label: "Points / match" },
  { key: "rpg", label: "Rebonds / match" },
  { key: "apg", label: "Passes / match" },
  { key: "spg", label: "Interceptions / match" },
  { key: "bpg", label: "Contres / match" },
  { key: "ts_pct", label: "Efficacité au tir (TS%)", suffix: "%" },
  { key: "pir", label: "PIR" },
];

function fmt(v: number | null | undefined) {
  return v == null ? "—" : Number(v).toFixed(1);
}

export default function ComparateurPage() {
  const [playerA, setPlayerA] = useState<PlayerStats | null>(null);
  const [playerB, setPlayerB] = useState<PlayerStats | null>(null);
  const [ranges, setRanges] = useState<Record<string, { min: number; max: number }>>({});
  const supabase = createClient();

  // Charge les min/max de la ligue pour situer les deux joueurs sur le radar
  // (usage interne uniquement pour positionner les points — les valeurs
  // affichées à l'écran restent toujours les stats brutes).
  useEffect(() => {
    async function loadRanges() {
      const { data } = await supabase
        .from("global_rankings")
        .select("ppg, rpg, apg, spg, bpg");
      if (!data) return;
      const next: Record<string, { min: number; max: number }> = {};
      RADAR_STATS.forEach(({ key }) => {
        const values = data.map((r) => Number(r[key] ?? 0));
        next[key] = { min: Math.min(...values), max: Math.max(...values) };
      });
      setRanges(next);
    }
    loadRanges();
  }, [supabase]);

  const radarData = useMemo(() => {
    if (!playerA || !playerB || Object.keys(ranges).length === 0) return [];
    return RADAR_STATS.map(({ key, label }) => {
      const range = ranges[key] ?? { min: 0, max: 1 };
      const span = range.max - range.min || 1;
      const normalize = (v: number | null) =>
        v == null ? 0 : Math.max(4, ((v - range.min) / span) * 100);
      return {
        stat: label,
        [playerA.player_name]: normalize(Number(playerA[key] ?? 0)),
        [playerB.player_name]: normalize(Number(playerB[key] ?? 0)),
      };
    });
  }, [playerA, playerB, ranges]);

  const bothSelected = playerA && playerB;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-bsh-orange tracking-wide mb-1">
        COMPARATEUR DE JOUEURS
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Compare deux joueurs, toutes ligues confondues, sur leurs stats de la saison.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <PlayerAutocomplete label="Joueur 1" selected={playerA} onSelect={setPlayerA} />
        <PlayerAutocomplete label="Joueur 2" selected={playerB} onSelect={setPlayerB} />
      </div>

      {!bothSelected && (
        <p className="text-center text-white/30 text-sm py-16 border border-dashed border-white/10 rounded-xl">
          Choisis deux joueurs pour lancer la comparaison.
        </p>
      )}

      {bothSelected && (
        <>
          <div className="border border-white/10 rounded-xl bg-white/[0.03] p-4 sm:p-6 mb-6">
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis
                    dataKey="stat"
                    tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700 }}
                  />
                  <Radar
                    name={playerA.player_name}
                    dataKey={playerA.player_name}
                    stroke="#FF6B00"
                    fill="#FF6B00"
                    fillOpacity={0.28}
                    strokeWidth={2}
                  />
                  <Radar
                    name={playerB.player_name}
                    dataKey={playerB.player_name}
                    stroke="#FFD60A"
                    fill="#FFD60A"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs mt-2">
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="w-2.5 h-2.5 rounded-full bg-bsh-orange" />
                {playerA.player_name}
              </span>
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="w-2.5 h-2.5 rounded-full bg-bsh-gold" />
                {playerB.player_name}
              </span>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-white/40 text-xs uppercase">
                  <th className="text-right py-2.5 px-3 font-semibold w-1/3">
                    {playerA.player_name}
                  </th>
                  <th className="text-center py-2.5 px-3 font-semibold">Stat</th>
                  <th className="text-left py-2.5 px-3 font-semibold w-1/3">
                    {playerB.player_name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_STATS.map(({ key, label, suffix }) => {
                  const valA = Number(playerA[key] ?? 0);
                  const valB = Number(playerB[key] ?? 0);
                  const aWins = valA > valB;
                  const bWins = valB > valA;
                  return (
                    <tr key={String(key)} className="border-t border-white/5">
                      <td
                        className={`text-right py-2.5 px-3 font-display text-lg ${
                          aWins ? "text-bsh-orange" : "text-white/50"
                        }`}
                      >
                        {fmt(playerA[key] as number)}
                        {suffix ?? ""}
                      </td>
                      <td className="text-center py-2.5 px-3 text-white/40 text-xs uppercase">
                        {label}
                      </td>
                      <td
                        className={`text-left py-2.5 px-3 font-display text-lg ${
                          bWins ? "text-bsh-gold" : "text-white/50"
                        }`}
                      >
                        {fmt(playerB[key] as number)}
                        {suffix ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
