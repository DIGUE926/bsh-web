/**
 * scripts/sync-ahbb.mjs
 *
 * Synchronise les joueurs et les moyennes saison AHBB depuis le site officiel
 * (https://www.ahbbayiti.com) vers Supabase, dans la table `imported_season_stats`
 * (voir migration `unify_global_rankings_with_imported_stats`).
 *
 * Ce script NE remplace PAS player_game_stats (pas de suivi match par match pour
 * AHBB) — il alimente uniquement des moyennes saison, exactement comme le veut
 * Digue : "je cherche pas à ajouter l'intégralité de l'AHBB, juste traverser les
 * infos concernant les joueurs sur la plateforme".
 *
 * Prérequis (une seule fois, voir scripts/setup-ahbb-league.sql) :
 *   - une ligue `leagues.slug = 'ahbb'` doit déjà exister
 *   - les 9 équipes AHBB doivent déjà exister dans `teams`, rattachées à cette ligue
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-ahbb.mjs
 *
 * ⚠️ IMPORTANT — non testé en conditions réelles :
 * Ce script a été écrit à partir d'une analyse du HTML de la page stats AHBB
 * (via un outil de résumé, pas un accès brut au HTML), car l'environnement qui l'a
 * écrit n'a pas d'accès réseau sortant pour tester en direct. Le format des colonnes
 * (24 colonnes : Numéro, Nom, Équipe, G, GS, FG(M/A/%), 3FG(M/A/%), FT(M/A/%),
 * REB(O/D/Tot), AST, TO, A/T, STL, BLK, PTS) est déduit et devrait être fiable pour un
 * site ASP "LeagueLineup"-style, mais la PREMIÈRE exécution doit être supervisée :
 * lancer avec `--dry-run` d'abord et vérifier que les lignes parsées ont du sens
 * avant de laisser le script écrire dans Supabase.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");
const SEASON = process.env.AHBB_SEASON || "2025-2026";

const STATS_URL =
  "https://www.ahbbayiti.com/teams/default.asp?u=AHBB&s=basketball&p=stats&ppageNum=";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Il manque SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY dans l'environnement."
  );
  process.exit(1);
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// 1. Récupération + parsing du HTML
// ---------------------------------------------------------------------------

async function fetchPage(pageNum) {
  const url = `${STATS_URL}${pageNum}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; bsh-web-sync/1.0; +https://bsh-web-one.vercel.app)",
    },
  });
  if (!res.ok) {
    throw new Error(`Échec fetch page ${pageNum}: HTTP ${res.status}`);
  }
  return res.text();
}

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function toNumber(str) {
  const cleaned = (str || "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toInt(str) {
  const n = toNumber(str);
  return n === null ? null : Math.round(n);
}

/**
 * Parse le tableau de stats. On cherche toutes les lignes <tr>...</tr> qui
 * contiennent exactement 24 cellules <td> (le format identifié : Numéro, Nom,
 * Équipe, G, GS, FGM, FGA, FG%, 3FGM, 3FGA, 3FG%, FTM, FTA, FT%, OREB, DREB,
 * TREB, AST, TO, A/T, STL, BLK, PTS, TSP) et dont la 2e cellule ressemble à un
 * nom de joueur (pas un en-tête).
 */
function parseStatsTable(html) {
  const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    const cellMatches = [
      ...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
    ].map((m) => stripTags(m[1]));

    if (cellMatches.length !== 24) continue;

    const [
      number,
      name,
      team,
      g,
      gs,
      fgm,
      fga,
      fgPct,
      tfgm,
      tfga,
      tfgPct,
      ftm,
      fta,
      ftPct,
      oreb,
      dreb,
      treb,
      ast,
      to,
      _at, // ratio assist/turnover — recalculable, on ignore la colonne brute
      stl,
      blk,
      pts,
      _tsp, // colonne finale du site, sémantique incertaine — ignorée volontairement
    ] = cellMatches;

    // Filtre les lignes d'en-tête / vides
    if (!name || /^name$/i.test(name) || !team) continue;
    const gamesPlayed = toInt(g);
    if (gamesPlayed === null) continue;

    rows.push({
      jersey_number: toInt(number),
      name: name.trim(),
      team: team.trim(),
      games_played: gamesPlayed,
      games_started: toInt(gs),
      fgm: toNumber(fgm),
      fga: toNumber(fga),
      fg_pct: toNumber(fgPct),
      tfgm: toNumber(tfgm),
      tfga: toNumber(tfga),
      three_pct: toNumber(tfgPct),
      ftm: toNumber(ftm),
      fta: toNumber(fta),
      ft_pct: toNumber(ftPct),
      oreb: toNumber(oreb),
      dreb: toNumber(dreb),
      rpg: toNumber(treb),
      apg: toNumber(ast),
      topg: toNumber(to),
      spg: toNumber(stl),
      bpg: toNumber(blk),
      ppg: toNumber(pts),
    });
  }

  return rows;
}

/**
 * Le formulaire ASP pagine via ppageNum=1,2,3... On s'arrête dès qu'une page
 * ne renvoie plus aucune ligne exploitable (ou après une limite de sécurité).
 */
async function fetchAllPlayers() {
  const all = [];
  const MAX_PAGES = 20;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchPage(page);
    const rows = parseStatsTable(html);
    if (rows.length === 0) break;
    all.push(...rows);
  }
  return all;
}

// ---------------------------------------------------------------------------
// 2. Calcul des stats dérivées (TS%, PIR) — même formule que player_season_stats,
//    appliquée aux moyennes saison plutôt qu'à des lignes match par match.
// ---------------------------------------------------------------------------

function computeDerived(row) {
  const g = row.games_played || 0;
  const totalPts = (row.ppg || 0) * g;
  const totalFga = (row.fga || 0) * g;
  const totalFta = (row.fta || 0) * g;

  const tsDenomSeason = 2 * totalFga + 0.44 * totalFta;
  const ts_pct =
    tsDenomSeason === 0
      ? 0
      : Math.round(((totalPts / tsDenomSeason) * 100 + Number.EPSILON) * 10) /
        10;

  const tsDenomAvg = 2 * (row.fga || 0) + 0.44 * (row.fta || 0);
  const tsBonusAvg = tsDenomAvg === 0 ? 0 : ((row.ppg || 0) / tsDenomAvg) * 20;
  const pir =
    Math.round(
      ((row.ppg || 0) + (row.rpg || 0) + (row.apg || 0) + tsBonusAvg +
        Number.EPSILON) *
        10
    ) / 10;

  return { ts_pct, pir };
}

// ---------------------------------------------------------------------------
// 3. Upsert Supabase (équipe -> joueur -> imported_season_stats)
// ---------------------------------------------------------------------------

async function getAhbbTeamsBySlug() {
  const { data: league, error: leagueErr } = await supabase
    .from("leagues")
    .select("id")
    .eq("slug", "ahbb")
    .single();
  if (leagueErr || !league) {
    throw new Error(
      "Ligue 'ahbb' introuvable. Lance d'abord scripts/setup-ahbb-league.sql dans Supabase."
    );
  }

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name")
    .eq("league_id", league.id);
  if (teamsErr) throw teamsErr;

  const byName = new Map(teams.map((t) => [t.name.trim().toLowerCase(), t]));
  return { leagueId: league.id, teamsByName: byName };
}

async function upsertPlayer(leagueId, teamId, row) {
  const { data: existing, error: findErr } = await supabase
    .from("players")
    .select("id, jersey_number")
    .eq("team_id", teamId)
    .ilike("name", row.name)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    if (row.jersey_number != null && existing.jersey_number == null) {
      await supabase
        .from("players")
        .update({ jersey_number: row.jersey_number })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error: insertErr } = await supabase
    .from("players")
    .insert({
      name: row.name,
      team_id: teamId,
      league_id: leagueId,
      jersey_number: row.jersey_number,
      // position et photo_url : non disponibles depuis la page stats du site
      // officiel AHBB — laissés null volontairement plutôt qu'inventés.
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  return created.id;
}

async function upsertSeasonStats(playerId, row, derived) {
  const { error } = await supabase.from("imported_season_stats").upsert(
    {
      player_id: playerId,
      season: SEASON,
      games_played: row.games_played,
      games_started: row.games_started,
      ppg: row.ppg,
      rpg: row.rpg,
      oreb: row.oreb,
      dreb: row.dreb,
      apg: row.apg,
      spg: row.spg,
      bpg: row.bpg,
      topg: row.topg,
      fg_pct: row.fg_pct,
      three_pct: row.three_pct,
      ft_pct: row.ft_pct,
      ts_pct: derived.ts_pct,
      pir: derived.pir,
      source: "ahbb_official_site",
      synced_at: new Date().toISOString(),
    },
    { onConflict: "player_id,season" }
  );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Récupération des stats AHBB (saison ${SEASON})...`);
  const rows = await fetchAllPlayers();
  console.log(`${rows.length} lignes joueur trouvées.`);

  if (rows.length === 0) {
    console.error(
      "Aucune ligne parsée — le format HTML a probablement changé. Vérifie manuellement la page avant de continuer."
    );
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("--dry-run actif : aucune écriture Supabase. Aperçu :");
    console.table(rows.slice(0, 10));
    console.log(`... (${rows.length} lignes au total)`);
    const teamsSeen = [...new Set(rows.map((r) => r.team))];
    console.log("Équipes détectées :", teamsSeen);
    return;
  }

  const { leagueId, teamsByName } = await getAhbbTeamsBySlug();

  let synced = 0;
  let skippedNoTeam = 0;

  for (const row of rows) {
    const team = teamsByName.get(row.team.trim().toLowerCase());
    if (!team) {
      console.warn(
        `Équipe "${row.team}" introuvable dans Supabase pour le joueur "${row.name}" — ligne ignorée. Vérifie scripts/setup-ahbb-league.sql (noms d'équipes AHBB).`
      );
      skippedNoTeam++;
      continue;
    }

    const playerId = await upsertPlayer(leagueId, team.id, row);
    const derived = computeDerived(row);
    await upsertSeasonStats(playerId, row, derived);
    synced++;
  }

  console.log(`Terminé : ${synced} joueurs synchronisés, ${skippedNoTeam} ignorés (équipe non reconnue).`);
}

main().catch((err) => {
  console.error("Erreur sync AHBB:", err);
  process.exit(1);
});
