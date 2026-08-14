"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = { id: string; name: string; league_id: string };

const ROUNDS = [
  { value: "demi_finale_1", label: "Demi-finale 1" },
  { value: "demi_finale_2", label: "Demi-finale 2" },
  { value: "petite_finale", label: "Petite finale" },
  { value: "finale", label: "Finale" },
];

export default function NouveauMatchPlayoffPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [round, setRound] = useState("demi_finale_1");
  const [gameNumber, setGameNumber] = useState("1");
  const [status, setStatus] = useState("scheduled");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase
        .from("teams")
        .select("id, name, league_id")
        .order("name");
      if (data) setTeams(data);
    }
    loadTeams();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (homeTeam === awayTeam) {
      setError("Les deux équipes doivent être différentes.");
      return;
    }

    setLoading(true);

    const homeTeamData = teams.find((t) => t.id === homeTeam);

    const { data, error } = await supabase
      .from("playoff_games")
      .insert({
        league_id: homeTeamData?.league_id,
        round,
        game_number: parseInt(gameNumber),
        team_home_id: homeTeam,
        team_away_id: awayTeam,
        game_date: gameDate,
        status,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setError("Erreur lors de la création du match : " + error.message);
      return;
    }

    router.push(`/admin/playoffs/match/${data.id}`);
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-4 tracking-wide">
        NOUVEAU MATCH PLAYOFF
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-white/60 mb-1">Tour</label>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {ROUNDS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            Numéro du match
          </label>
          <input
            type="number"
            min={1}
            value={gameNumber}
            onChange={(e) => setGameNumber(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            Équipe à domicile
          </label>
          <select
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="">Sélectionner...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            Équipe visiteuse
          </label>
          <select
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="">Sélectionner...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Date</label>
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="scheduled">Programmé</option>
            <option value="completed">Terminé</option>
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-bsh-orange text-black font-bold rounded-lg py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer le match et saisir les stats"}
        </button>
      </form>
    </div>
  );
}
