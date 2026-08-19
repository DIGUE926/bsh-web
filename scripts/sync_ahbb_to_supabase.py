"""
sync_ahbb_to_supabase.py
-------------------------
Scrape les moyennes saison AHBB (via ahbb_scraper.py) et les pousse dans
Supabase : upsert des joueurs (players, matchés par leur playerID AHBB
stable) + upsert de leurs moyennes saison (imported_season_stats).

Ne touche jamais à player_game_stats — AHBB n'a pas de suivi match par
match disponible publiquement (vérifié : ni le site officiel, ni
ahbb-tracker n'ont de box-score par match, seulement des stats saison
cumulées). Le classement AHBB sur bsh-web est donc basé sur ces moyennes
saison, exactement comme le "Player Impact Ranking" déjà envoyé sur
Discord par ahbb-tracker (même formule TS%/PIR).

Prérequis (une seule fois) : lancer scripts/setup-ahbb-league.sql dans le
SQL Editor Supabase, pour créer la ligue 'ahbb' et ses 9 équipes.

Usage :
    pip install requests beautifulsoup4
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/sync_ahbb_to_supabase.py [--dry-run]

Pour tourner automatiquement (comme le reste d'ahbb-tracker), ce script
est fait pour être lancé via une GitHub Action planifiée (cron), avec
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en secrets du repo.
"""

import os
import sys
import requests

from ahbb_scraper import scrape_all_players

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SEASON = os.environ.get("AHBB_SEASON", "2025-2026")
DRY_RUN = "--dry-run" in sys.argv

EXTERNAL_SOURCE = "ahbb_official_site"


def _headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def get_ahbb_league_id():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/leagues",
        params={"slug": "eq.ahbb", "select": "id"},
        headers=_headers(),
        timeout=20,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise RuntimeError(
            "Ligue 'ahbb' introuvable dans Supabase. "
            "Lance d'abord scripts/setup-ahbb-league.sql dans le SQL Editor Supabase."
        )
    return rows[0]["id"]


def get_ahbb_teams(league_id):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/teams",
        params={"league_id": f"eq.{league_id}", "select": "id,name"},
        headers=_headers(),
        timeout=20,
    )
    resp.raise_for_status()
    return {t["name"].strip().lower(): t["id"] for t in resp.json()}


def upsert_player(league_id, team_id, row):
    """Upsert par (external_source, external_id) -- clé stable côté AHBB."""
    jersey = None
    if row.get("jersey_no"):
        try:
            jersey = int(float(row["jersey_no"]))
        except (TypeError, ValueError):
            jersey = None

    payload = [{
        "name": row["name"],
        "team_id": team_id,
        "league_id": league_id,
        "jersey_number": jersey,
        "external_source": EXTERNAL_SOURCE,
        "external_id": row["player_id"],
        # position / photo_url : non disponibles depuis le site officiel AHBB,
        # laissés tels quels (pas écrasés, pas inventés).
    }]

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/players",
        params={"on_conflict": "external_source,external_id"},
        headers={**_headers(), "Prefer": "resolution=merge-duplicates,return=representation"},
        json=payload,
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()[0]["id"]


def compute_derived(row):
    """
    TS% et PIR calculés sur la saison, avec la même formule que
    player_season_stats (bsh-web) / impact_ranking.py (ahbb-tracker) --
    les deux utilisent déjà TS% = PTS / (2*FGA + 0.44*FTA).
    """
    games = row.get("games") or 0
    ppg = row.get("pts") or 0
    fga = row.get("fg_att") or 0
    fta = row.get("ft_att") or 0

    total_pts = ppg * games
    total_fga = fga * games
    total_fta = fta * games
    ts_denom_season = 2 * total_fga + 0.44 * total_fta
    ts_pct = round((total_pts / ts_denom_season) * 100, 1) if ts_denom_season else 0.0

    ts_denom_avg = 2 * fga + 0.44 * fta
    ts_bonus_avg = (ppg / ts_denom_avg) * 20 if ts_denom_avg else 0.0
    pir = round(ppg + (row.get("reb_total") or 0) + (row.get("ast") or 0) + ts_bonus_avg, 1)

    return ts_pct, pir


def upsert_season_stats(player_id, row):
    ts_pct, pir = compute_derived(row)

    payload = [{
        "player_id": player_id,
        "season": SEASON,
        "games_played": row.get("games"),
        "games_started": row.get("games_started"),
        "ppg": row.get("pts"),
        "rpg": row.get("reb_total"),
        "oreb": row.get("oreb"),
        "dreb": row.get("dreb"),
        "apg": row.get("ast"),
        "spg": row.get("stl"),
        "bpg": row.get("blk"),
        "topg": row.get("to"),
        "fg_pct": row.get("fg_pct"),
        "three_pct": row.get("fg3_pct"),
        "ft_pct": row.get("ft_pct"),
        "ts_pct": ts_pct,
        "pir": pir,
        "source": EXTERNAL_SOURCE,
    }]

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/imported_season_stats",
        params={"on_conflict": "player_id,season"},
        headers={**_headers(), "Prefer": "resolution=merge-duplicates"},
        json=payload,
        timeout=20,
    )
    resp.raise_for_status()


def main():
    print(f"Scraping AHBB (saison {SEASON})...")
    players = scrape_all_players()
    print(f"{len(players)} joueurs scrapes.")

    if not players:
        print("Aucun joueur scrapé -- le format du site a probablement changé. On s'arrête là.")
        sys.exit(1)

    if DRY_RUN:
        print("--dry-run actif : aucune écriture Supabase.")
        for p in players[:10]:
            print(p)
        teams_seen = sorted({p["team"] for p in players if p.get("team")})
        print("Équipes détectées :", teams_seen)
        return

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Il manque SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY dans l'environnement.")
        sys.exit(1)

    league_id = get_ahbb_league_id()
    teams_by_name = get_ahbb_teams(league_id)

    synced = 0
    skipped = 0
    for row in players:
        if not row.get("player_id") or not row.get("team"):
            skipped += 1
            continue
        team_id = teams_by_name.get(row["team"].strip().lower())
        if not team_id:
            print(f"Équipe '{row['team']}' introuvable dans Supabase pour {row['name']} -- ignoré.")
            skipped += 1
            continue

        player_id = upsert_player(league_id, team_id, row)
        upsert_season_stats(player_id, row)
        synced += 1

    print(f"Terminé : {synced} joueurs synchronisés, {skipped} ignorés.")


if __name__ == "__main__":
    main()
