"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Player = {
  id: string;
  name: string;
  team_id: string | null;
  league_id: string;
  position: string | null;
};
type Team = { id: string; name: string; league_id: string };
type League = { id: string; slug: string; name: string };

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export default function PlayersPositionEditor() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: leagueRows }, { data: teamRows }, { data: playerRows }] = await Promise.all([
        supabase.from("leagues").select("id, slug, name").order("name"),
        supabase.from("teams").select("id, name, league_id").order("name"),
        supabase.from("players").select("id, name, team_id, league_id, position").order("name"),
      ]);
      setLeagues(leagueRows ?? []);
      setTeams(teamRows ?? []);
      setPlayers((playerRows ?? []) as Player[]);
    }
    load();
  }, [supabase]);

  async function updatePosition(player: Player, position: string) {
    setError(null);
    setSavingId(player.id);
    const value = position === "" ? null : position;
    const { error: updateError } = await supabase
      .from("players")
      .update({ position: value })
      .eq("id", player.id);
    setSavingId(null);
    if (updateError) {
      setError(`Échec pour ${player.name} : ${updateError.message}`);
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, position: value } : p)));
  }

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const visibleLeagues =
    leagueFilter === "all" ? leagues : leagues.filter((l) => l.id === leagueFilter);

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        POSITIONS DES JOUEURS
      </h1>
      <p className="text-sm text-white/50 mb-4 max-w-xl">
        Meneur (PG), arrière (SG), ailier (SF), ailier fort (PF), pivot (C). Sert de filtre sur
        les classements publics — laisse sur &quot;—&quot; si inconnu.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setLeagueFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            leagueFilter === "all" ? "bg-bsh-orange text-black" : "bg-white/5 text-white/50"
          }`}
        >
          Toutes les ligues
        </button>
        {leagues.map((l) => (
          <button
            key={l.id}
            onClick={() => setLeagueFilter(l.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              leagueFilter === l.id ? "bg-bsh-orange text-black" : "bg-white/5 text-white/50"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="space-y-8 max-w-3xl">
        {visibleLeagues.map((league) => {
          const leagueTeams = teams.filter((t) => t.league_id === league.id);
          return (
            <div key={league.id}>
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">
                {league.name}
              </h2>
              <div className="space-y-6">
                {leagueTeams.map((team) => {
                  const teamPlayers = players.filter((p) => p.team_id === team.id);
                  if (teamPlayers.length === 0) return null;
                  return (
                    <div key={team.id}>
                      <p className="text-sm text-white/60 font-semibold mb-1.5">{team.name}</p>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                          >
                            <span className="text-sm text-white/70 flex-1 truncate">
                              {player.name}
                            </span>
                            <select
                              value={player.position ?? ""}
                              onChange={(e) => updatePosition(player, e.target.value)}
                              disabled={savingId === player.id}
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 focus:border-bsh-orange outline-none disabled:opacity-40"
                            >
                              <option value="">—</option>
                              {POSITIONS.map((pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {players.filter((p) => p.league_id === league.id && !teamsById.has(p.team_id ?? "")).length >
                  0 && (
                  <p className="text-xs text-white/30">
                    Certains joueurs de cette ligue n&apos;ont pas d&apos;équipe assignée — non
                    listés ici.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
