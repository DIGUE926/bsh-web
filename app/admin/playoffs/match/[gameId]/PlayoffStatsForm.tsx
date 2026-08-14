"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Player = { id: string; name: string; jersey_number: number | null };
type Stat = {
  id: string;
  player_id: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fgm: number | null;
  fga: number | null;
  ftm: number | null;
  fta: number | null;
  min: number | null;
};

const STAT_FIELDS = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "fgm",
  "fga",
  "ftm",
  "fta",
  "min",
] as const;

type StatField = (typeof STAT_FIELDS)[number];
type PlayerStatsForm = Record<string, Record<StatField, string>>;

function buildInitialForm(
  players: Player[],
  existingStats: Stat[]
): PlayerStatsForm {
  const form: PlayerStatsForm = {};
  for (const p of players) {
    const existing = existingStats.find((s) => s.player_id === p.id);
    form[p.id] = {
      pts: existing?.pts?.toString() ?? "",
      reb: existing?.reb?.toString() ?? "",
      ast: existing?.ast?.toString() ?? "",
      stl: existing?.stl?.toString() ?? "",
      blk: existing?.blk?.toString() ?? "",
      fgm: existing?.fgm?.toString() ?? "",
      fga: existing?.fga?.toString() ?? "",
      ftm: existing?.ftm?.toString() ?? "",
      fta: existing?.fta?.toString() ?? "",
      min: existing?.min?.toString() ?? "",
    };
  }
  return form;
}

export default function PlayoffStatsForm({
  gameId,
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  existingStats,
  initialHomeScore,
  initialAwayScore,
}: {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  existingStats: Stat[];
  initialHomeScore: number | null;
  initialAwayScore: number | null;
}) {
  const allPlayers = [...homePlayers, ...awayPlayers];
  const [form, setForm] = useState<PlayerStatsForm>(() =>
    buildInitialForm(allPlayers, existingStats)
  );
  const [homeScore, setHomeScore] = useState(
    initialHomeScore?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    initialAwayScore?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function updateField(playerId: string, field: StatField, value: string) {
    setForm((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Met à jour le score du match
    await supabase
      .from("playoff_games")
      .update({
        home_score: homeScore ? parseInt(homeScore) : null,
        away_score: awayScore ? parseInt(awayScore) : null,
        status: "completed",
      })
      .eq("id", gameId);

    // Upsert des stats joueur par joueur
    for (const player of allPlayers) {
      const values = form[player.id];
      const hasAnyValue = STAT_FIELDS.some((f) => values[f] !== "");
      if (!hasAnyValue) continue;

      const existing = existingStats.find((s) => s.player_id === player.id);

      const payload: Record<string, string | number | null> = {
        playoff_game_id: gameId,
        player_id: player.id,
      };
      for (const f of STAT_FIELDS) {
        payload[f] = values[f] === "" ? null : parseInt(values[f]);
      }

      if (existing) {
        await supabase
          .from("playoff_player_stats")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await supabase.from("playoff_player_stats").insert(payload);
      }
    }

    setSaving(false);
    setMessage("Stats enregistrées !");
    router.refresh();
  }

  function renderTeamTable(teamName: string, players: Player[]) {
    return (
      <div className="mb-10">
        <h2 className="font-display text-xl text-bsh-gold mb-4 tracking-wide">
          {teamName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-2">Joueur</th>
                {STAT_FIELDS.map((f) => (
                  <th key={f} className="py-2 px-1 text-center uppercase">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-semibold whitespace-nowrap">
                    #{p.jersey_number ?? "-"} {p.name}
                  </td>
                  {STAT_FIELDS.map((f) => (
                    <td key={f} className="py-1 px-1">
                      <input
                        type="number"
                        value={form[p.id]?.[f] ?? ""}
                        onChange={(e) =>
                          updateField(p.id, f, e.target.value)
                        }
                        className="w-14 bg-white/5 border border-white/10 rounded px-1 py-1 text-center focus:border-bsh-orange outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={STAT_FIELDS.length + 1} className="py-4 text-white/50">
                    Aucun joueur dans le roster.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-6 mb-10 max-w-sm">
        <div className="flex-1">
          <label className="block text-sm text-white/60 mb-1">
            Score {homeTeamName}
          </label>
          <input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-white/60 mb-1">
            Score {awayTeamName}
          </label>
          <input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>
      </div>

      {renderTeamTable(homeTeamName, homePlayers)}
      {renderTeamTable(awayTeamName, awayPlayers)}

      {message && (
        <div className="mb-4 flex items-center gap-4">
          <p className="text-green-400">{message}</p>
          <a
            href="/admin/playoffs"
            className="text-sm text-bsh-orange hover:underline"
          >
            ← Retour aux matchs playoffs
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-bsh-orange text-black font-bold rounded-lg px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Enregistrer les stats"}
      </button>
    </form>
  );
}
