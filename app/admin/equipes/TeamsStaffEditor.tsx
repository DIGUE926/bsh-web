"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  league_id: string;
  head_coach: string | null;
  assistant_coach: string | null;
};
type League = { id: string; slug: string; name: string };

export default function TeamsStaffEditor() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { head_coach: string; assistant_coach: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: leagueRows }, { data: teamRows }] = await Promise.all([
        supabase.from("leagues").select("id, slug, name").order("name"),
        supabase
          .from("teams")
          .select("id, name, league_id, head_coach, assistant_coach")
          .order("name"),
      ]);
      setLeagues(leagueRows ?? []);
      setTeams((teamRows ?? []) as Team[]);
      const initialDrafts: Record<string, { head_coach: string; assistant_coach: string }> = {};
      (teamRows ?? []).forEach((t) => {
        initialDrafts[t.id] = {
          head_coach: t.head_coach ?? "",
          assistant_coach: t.assistant_coach ?? "",
        };
      });
      setDrafts(initialDrafts);
    }
    load();
  }, [supabase]);

  function updateDraft(teamId: string, field: "head_coach" | "assistant_coach", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
    setSavedId(null);
  }

  function isDirty(team: Team) {
    const draft = drafts[team.id];
    if (!draft) return false;
    return (
      draft.head_coach !== (team.head_coach ?? "") ||
      draft.assistant_coach !== (team.assistant_coach ?? "")
    );
  }

  async function save(team: Team) {
    const draft = drafts[team.id];
    if (!draft) return;
    setError(null);
    setSavingId(team.id);

    const { error: updateError } = await supabase
      .from("teams")
      .update({
        head_coach: draft.head_coach.trim() || null,
        assistant_coach: draft.assistant_coach.trim() || null,
      })
      .eq("id", team.id);

    setSavingId(null);
    if (updateError) {
      setError(`Échec pour ${team.name} : ${updateError.message}`);
      return;
    }

    setTeams((prev) =>
      prev.map((t) =>
        t.id === team.id
          ? { ...t, head_coach: draft.head_coach.trim() || null, assistant_coach: draft.assistant_coach.trim() || null }
          : t
      )
    );
    setSavedId(team.id);
  }

  const teamsByLeague = leagues.map((l) => ({
    league: l,
    teams: teams.filter((t) => t.league_id === l.id),
  }));

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        STAFF DES ÉQUIPES
      </h1>
      <p className="text-sm text-white/50 mb-6 max-w-xl">
        Nom du coach et de l&apos;assistant coach par équipe. Laisse vide si inconnu — rien ne
        s&apos;affiche publiquement tant que le champ est vide.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="space-y-8 max-w-2xl">
        {teamsByLeague.map(({ league, teams: leagueTeams }) => (
          <div key={league.id}>
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">
              {league.name}
            </h2>
            <div className="space-y-1.5">
              {leagueTeams.map((team) => {
                const draft = drafts[team.id] ?? { head_coach: "", assistant_coach: "" };
                const dirty = isDirty(team);
                return (
                  <div
                    key={team.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-sm text-white/70 font-semibold w-full sm:w-40 shrink-0">
                      {team.name}
                    </span>
                    <input
                      value={draft.head_coach}
                      onChange={(e) => updateDraft(team.id, "head_coach", e.target.value)}
                      placeholder="Coach"
                      className="flex-1 min-w-[140px] bg-transparent border-b border-white/10 px-1 py-1 text-sm text-white/70 placeholder:text-white/25 focus:border-bsh-orange outline-none"
                    />
                    <input
                      value={draft.assistant_coach}
                      onChange={(e) => updateDraft(team.id, "assistant_coach", e.target.value)}
                      placeholder="Assistant coach"
                      className="flex-1 min-w-[140px] bg-transparent border-b border-white/10 px-1 py-1 text-sm text-white/70 placeholder:text-white/25 focus:border-bsh-orange outline-none"
                    />
                    <button
                      onClick={() => save(team)}
                      disabled={!dirty || savingId === team.id}
                      className="shrink-0 text-xs font-semibold rounded-full px-3 py-1 bg-white/5 text-white/40 hover:text-bsh-orange disabled:opacity-30 disabled:hover:text-white/40"
                    >
                      {savingId === team.id
                        ? "..."
                        : savedId === team.id && !dirty
                          ? "✓"
                          : "Enregistrer"}
                    </button>
                  </div>
                );
              })}
              {leagueTeams.length === 0 && (
                <p className="text-xs text-white/30">Aucune équipe pour cette ligue.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
