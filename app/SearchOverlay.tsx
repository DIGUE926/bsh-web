"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import U20Badge from "./U20Badge";

type PlayerResult = {
  player_id: string;
  player_name: string;
  team_name: string | null;
  league_slug: string;
  league_name: string;
};

type TeamResult = {
  id: string;
  name: string;
  logo_url: string | null;
  league: { slug: string; name: string } | null;
};

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const [{ data: playerRows }, { data: teamRows }] = await Promise.all([
        supabase
          .from("global_rankings")
          .select("player_id, player_name, team_name, league_slug, league_name")
          .ilike("player_name", `%${q}%`)
          .limit(8),
        supabase
          .from("teams")
          .select("id, name, logo_url, league:league_id(slug, name)")
          .ilike("name", `%${q}%`)
          .limit(5),
      ]);
      setPlayers((playerRows ?? []) as PlayerResult[]);
      setTeams((teamRows ?? []) as unknown as TeamResult[]);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, supabase]);

  const hasResults = players.length > 0 || teams.length > 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center px-3 pt-16 sm:pt-24">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-bsh-black border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un joueur ou une équipe..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
          />
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-xs shrink-0">
            Fermer
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-xs text-white/30">
              Tape au moins 2 lettres pour chercher.
            </p>
          )}

          {query.trim().length >= 2 && !loading && !hasResults && (
            <p className="px-4 py-6 text-center text-xs text-white/30">
              Aucun résultat pour « {query} ».
            </p>
          )}

          {players.length > 0 && (
            <div className="py-1">
              <p className="px-3 pt-2 pb-0.5 text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                Joueurs
              </p>
              {players.map((p) => (
                <Link
                  key={p.player_id}
                  href={`/${p.league_slug}/joueur/${p.player_id}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5"
                >
                  <Avatar name={p.player_name} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/90 truncate">
                      {p.player_name}
                    </p>
                    <p className="text-[11px] text-white/40 truncate flex items-center gap-1">
                      {p.team_name ?? "—"} · {p.league_name}
                      <U20Badge slug={p.league_slug} />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {teams.length > 0 && (
            <div className="py-1 border-t border-white/5">
              <p className="px-3 pt-2 pb-0.5 text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                Équipes
              </p>
              {teams.map((t) => (
                <Link
                  key={t.id}
                  href={`/${t.league?.slug}/equipe/${t.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5"
                >
                  <Avatar name={t.name} src={t.logo_url} size={28} rounded="rounded" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/90 truncate">{t.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{t.league?.name ?? "—"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
