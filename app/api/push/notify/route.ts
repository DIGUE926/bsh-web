import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPushToAll } from "@/lib/webpush";
import { shortTeamName } from "@/lib/teamDisplay";

export const dynamic = "force-dynamic";

// Appelée par le trigger Postgres `notify_game_status_change()` (voir la
// migration appliquée le 2026-08-31) via pg_net dès qu'un match passe à
// "live" ou "completed" dans `games` ou `playoff_games`. Protégée par un
// secret partagé plutôt que par une session -- pg_net n'a pas de cookie
// d'auth Supabase, c'est un appel HTTP serveur-à-serveur.
type NotifyBody = {
  event: "game_live" | "game_completed";
  table: "games" | "playoff_games";
  gameId: string;
};

export async function POST(req: Request) {
  const secret = req.headers.get("x-push-secret");
  if (!secret || secret !== process.env.PUSH_CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let payload: NotifyBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { event, table, gameId } = payload;
  if (!gameId || (table !== "games" && table !== "playoff_games")) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const isPlayoff = table === "playoff_games";
  const selectCols = isPlayoff
    ? "id, home_score, away_score, round, home_team:team_home_id(name), away_team:team_away_id(name), league:league_id(slug)"
    : "id, home_score, away_score, home_team:home_team_id(name), away_team:away_team_id(name), league:league_id(slug)";

  const { data: game, error } = await supabase
    .from(table)
    .select(selectCols)
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }

  // Les relations Supabase typées côté client génèrent des types imprécis
  // (objet ou tableau selon la relation) -- on normalise ici plutôt que de
  // se battre avec les types générés.
  const g = game as unknown as {
    id: string;
    home_score: number | null;
    away_score: number | null;
    round?: string | null;
    home_team: { name: string } | { name: string }[] | null;
    away_team: { name: string } | { name: string }[] | null;
    league: { slug: string } | { slug: string }[] | null;
  };
  const oneOf = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const homeTeam = oneOf(g.home_team);
  const awayTeam = oneOf(g.away_team);
  const league = oneOf(g.league);

  if (!homeTeam || !awayTeam || !league) {
    return NextResponse.json({ error: "Données de match incomplètes." }, { status: 422 });
  }

  const home = shortTeamName(homeTeam.name);
  const away = shortTeamName(awayTeam.name);
  const url = isPlayoff ? `/${league.slug}/playoffs/${g.id}` : `/${league.slug}/match/${g.id}`;

  let title: string;
  let body: string;
  if (event === "game_live") {
    title = "🔴 Ça commence !";
    body = `${home} vs ${away} est en direct sur BSH.`;
  } else {
    title = "🏀 Match terminé";
    body = `${home} ${g.home_score ?? 0} - ${g.away_score ?? 0} ${away}`;
  }

  const result = await sendPushToAll({ title, body, url });
  return NextResponse.json(result);
}
