"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/app/Avatar";
import U20Badge from "@/app/U20Badge";

export type PlayerStats = {
  player_id: string;
  player_name: string;
  team_name: string | null;
  league_slug: string;
  league_name: string;
  games_played: number | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  spg: number | null;
  bpg: number | null;
  ts_pct: number | null;
  pir: number | null;
};

export default function PlayerAutocomplete({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: PlayerStats | null;
  onSelect: (p: PlayerStats) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerStats[]>([]);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("global_rankings")
        .select(
          "player_id, player_name, team_name, league_slug, league_name, games_played, ppg, rpg, apg, spg, bpg, ts_pct, pir"
        )
        .ilike("player_name", `%${q}%`)
        .order("player_name", { ascending: true })
        .limit(8);
      setResults((data ?? []) as PlayerStats[]);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, supabase]);

  return (
    <div ref={ref} className="relative flex-1 min-w-[220px]">
      <label className="block text-xs text-white/40 uppercase tracking-wide mb-1.5">
        {label}
      </label>

      {selected ? (
        <div className="flex items-center gap-2.5 border border-white/10 bg-white/5 rounded-lg px-3 py-2.5">
          <Avatar name={selected.player_name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white/90 truncate">{selected.player_name}</p>
            <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
              {selected.team_name ?? "—"} · {selected.league_name}
              <U20Badge slug={selected.league_slug} />
            </p>
          </div>
          <button
            onClick={() => {
              onSelect(null as unknown as PlayerStats);
              setQuery("");
              setResults([]);
            }}
            className="text-white/30 hover:text-white/60 text-xs shrink-0"
          >
            Changer
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Nom du joueur..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-bsh-orange outline-none"
        />
      )}

      {focused && !selected && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-bsh-black border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.player_id}
              onClick={() => {
                onSelect(p);
                setQuery("");
                setResults([]);
                setFocused(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left"
            >
              <Avatar name={p.player_name} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90 truncate">{p.player_name}</p>
                <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
                  {p.team_name ?? "—"} · {p.league_name}
                  <U20Badge slug={p.league_slug} />
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
