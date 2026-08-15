"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CourtDiagram, { ShotPoint, guessShotType } from "@/app/CourtDiagram";

type Team = { id: string; name: string };
type Player = { id: string; name: string; jersey_number: number | null };
type ShotEvent = ShotPoint & {
  id: string;
  player_id: string;
  team_id: string;
  period: number;
};

export default function LiveControls({
  gameId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
  initialPeriod,
  initialClock,
  initialShots,
}: {
  gameId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  initialHomeScore: number;
  initialAwayScore: number;
  initialStatus: string;
  initialPeriod: number;
  initialClock: string;
  initialShots: ShotEvent[];
}) {
  const supabase = createClient();

  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [status, setStatus] = useState(initialStatus);
  const [period, setPeriod] = useState(initialPeriod);
  const [clock, setClock] = useState(initialClock);
  const [shots, setShots] = useState<ShotEvent[]>(initialShots);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(homeTeam.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [pendingShot, setPendingShot] = useState<{ x: number; y: number } | null>(null);

  const players = selectedTeamId === homeTeam.id ? homePlayers : awayPlayers;

  async function persistScore(newHome: number, newAway: number) {
    setHomeScore(newHome);
    setAwayScore(newAway);
    await supabase
      .from("games")
      .update({ home_score: newHome, away_score: newAway })
      .eq("id", gameId);
  }

  function adjustScore(team: "home" | "away", delta: number) {
    if (team === "home") persistScore(Math.max(0, homeScore + delta), awayScore);
    else persistScore(homeScore, Math.max(0, awayScore + delta));
  }

  async function goLive() {
    setStatus("live");
    await supabase.from("games").update({ status: "live" }).eq("id", gameId);
  }

  async function endGame() {
    setStatus("completed");
    await supabase.from("games").update({ status: "completed" }).eq("id", gameId);
  }

  async function changePeriod(delta: number) {
    const next = Math.max(1, period + delta);
    setPeriod(next);
    await supabase.from("games").update({ current_period: next }).eq("id", gameId);
  }

  async function saveClock() {
    await supabase.from("games").update({ clock_display: clock }).eq("id", gameId);
  }

  function handleCourtClick(x: number, y: number) {
    if (!selectedPlayerId) return;
    setPendingShot({ x, y });
  }

  async function confirmShot(shot_type: "2PT" | "3PT", made: boolean) {
    if (!pendingShot || !selectedPlayerId) return;
    const points = made ? (shot_type === "3PT" ? 3 : 2) : 0;

    const { data, error } = await supabase
      .from("shot_events")
      .insert({
        game_id: gameId,
        player_id: selectedPlayerId,
        team_id: selectedTeamId,
        period,
        x: pendingShot.x,
        y: pendingShot.y,
        shot_type,
        made,
        points,
      })
      .select()
      .single();

    if (!error && data) {
      setShots((prev) => [...prev, data as ShotEvent]);
      if (made) {
        if (selectedTeamId === homeTeam.id) adjustScore("home", points);
        else adjustScore("away", points);
      }
    }
    setPendingShot(null);
  }

  async function logFreeThrow(made: boolean) {
    if (!selectedPlayerId) return;
    const points = made ? 1 : 0;
    const { data, error } = await supabase
      .from("shot_events")
      .insert({
        game_id: gameId,
        player_id: selectedPlayerId,
        team_id: selectedTeamId,
        period,
        x: 50,
        y: 19,
        shot_type: "FT",
        made,
        points,
      })
      .select()
      .single();

    if (!error && data) {
      setShots((prev) => [...prev, data as ShotEvent]);
      if (made) {
        if (selectedTeamId === homeTeam.id) adjustScore("home", 1);
        else adjustScore("away", 1);
      }
    }
  }

  async function undoLastShot() {
    const last = shots[shots.length - 1];
    if (!last) return;
    await supabase.from("shot_events").delete().eq("id", last.id);
    setShots((prev) => prev.slice(0, -1));
    if (last.made) {
      const pts = last.shot_type === "3PT" ? 3 : last.shot_type === "2PT" ? 2 : 1;
      if (last.team_id === homeTeam.id) adjustScore("home", -pts);
      else adjustScore("away", -pts);
    }
  }

  const guess = pendingShot ? guessShotType(pendingShot.x, pendingShot.y) : "2PT";

  return (
    <div>
      {/* Status + score bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 border border-white/10 rounded-lg bg-white/5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "live" ? "bg-red-500 animate-pulse" : "bg-white/30"
            }`}
          />
          <span className="text-xs uppercase text-white/60">{status}</span>
        </div>
        {status !== "live" && status !== "completed" && (
          <button onClick={goLive} className="bg-red-600 text-white text-sm font-bold rounded px-3 py-1.5">
            ● Démarrer le direct
          </button>
        )}
        {status === "live" && (
          <button onClick={endGame} className="bg-white/10 text-white text-sm font-bold rounded px-3 py-1.5 hover:bg-white/20">
            Terminer le match
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => changePeriod(-1)} className="w-7 h-7 rounded bg-white/10 hover:bg-white/20">−</button>
          <span className="text-sm text-white/70 w-16 text-center">Période {period}</span>
          <button onClick={() => changePeriod(1)} className="w-7 h-7 rounded bg-white/10 hover:bg-white/20">+</button>
        </div>

        <input
          value={clock}
          onChange={(e) => setClock(e.target.value)}
          onBlur={saveClock}
          placeholder="8:42"
          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-center text-sm focus:border-bsh-orange outline-none"
        />
      </div>

      {/* Score display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {([{ team: homeTeam, score: homeScore, key: "home" as const }, { team: awayTeam, score: awayScore, key: "away" as const }]).map(
          ({ team, score, key }) => (
            <div key={team.id} className="border border-white/10 rounded-lg p-4 text-center bg-white/5">
              <p className="text-sm text-white/60 mb-1">{team.name}</p>
              <p className="font-display text-4xl text-bsh-gold mb-3">{score}</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => adjustScore(key, -1)} className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-sm">−1</button>
                <button onClick={() => adjustScore(key, 1)} className="w-8 h-8 rounded bg-bsh-orange/20 hover:bg-bsh-orange/30 text-bsh-orange text-sm">+1</button>
                <button onClick={() => adjustScore(key, 2)} className="w-8 h-8 rounded bg-bsh-orange/20 hover:bg-bsh-orange/30 text-bsh-orange text-sm">+2</button>
                <button onClick={() => adjustScore(key, 3)} className="w-8 h-8 rounded bg-bsh-orange/20 hover:bg-bsh-orange/30 text-bsh-orange text-sm">+3</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Player selection */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {[homeTeam, awayTeam].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTeamId(t.id);
                setSelectedPlayerId("");
              }}
              className={`px-3 py-1.5 text-sm ${
                selectedTeamId === t.id ? "bg-bsh-orange text-black font-bold" : "bg-white/5 text-white/70"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm focus:border-bsh-orange outline-none"
        >
          <option value="">— Choisir un joueur —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.jersey_number ?? "-"} {p.name}
            </option>
          ))}
        </select>

        {selectedPlayerId && (
          <>
            <button onClick={() => logFreeThrow(true)} className="text-sm bg-green-600/20 text-green-400 rounded px-3 py-1.5">
              LF réussi
            </button>
            <button onClick={() => logFreeThrow(false)} className="text-sm bg-red-600/20 text-red-400 rounded px-3 py-1.5">
              LF raté
            </button>
          </>
        )}

        {shots.length > 0 && (
          <button onClick={undoLastShot} className="text-sm text-white/50 hover:text-white ml-auto">
            ↩ Annuler dernier tir
          </button>
        )}
      </div>

      {!selectedPlayerId && (
        <p className="text-xs text-white/40 mb-2">Choisis un joueur avant de taper sur le terrain.</p>
      )}

      {/* Court diagram */}
      <div className="max-w-md relative">
        <CourtDiagram shots={shots} onCourtClick={selectedPlayerId ? handleCourtClick : undefined} />

        {pendingShot && (
          <div
            className="absolute bg-bsh-black border border-bsh-orange rounded-lg p-2 flex flex-col gap-1 shadow-xl z-10"
            style={{
              left: `${pendingShot.x}%`,
              top: `${pendingShot.y}%`,
              transform: "translate(-50%, 8px)",
            }}
          >
            <div className="flex gap-1">
              {(["2PT", "3PT"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => confirmShot(t, true)}
                  className={`text-xs px-2 py-1 rounded ${
                    t === guess ? "bg-green-600 text-white font-bold" : "bg-white/10 text-white/70"
                  }`}
                >
                  {t} ✓
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["2PT", "3PT"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => confirmShot(t, false)}
                  className="text-xs px-2 py-1 rounded bg-white/10 text-white/70"
                >
                  {t} ✗
                </button>
              ))}
            </div>
            <button onClick={() => setPendingShot(null)} className="text-xs text-white/40">
              annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
