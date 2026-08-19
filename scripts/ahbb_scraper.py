"""
ahbb_scraper.py
----------------
Scraper des stats saison AHBB, repris quasi tel quel de scraper.py dans le
repo ahbb-tracker de Digue (déjà en prod, déjà validé — inutile de
réinventer une logique de parsing qui marche déjà).

Scrape toutes les pages de stats joueurs sur ahbbayiti.com et retourne une
liste de dicts, un par joueur, avec toutes les stats per-game de la saison
en cours.
"""

import re
import time
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.ahbbayiti.com/teams/default.asp"
PARAMS_BASE = {"p": "stats", "s": "basketball", "u": "AHBB"}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

# Colonnes dans l'ordre exact ou elles apparaissent dans le tableau HTML.
COLUMNS = [
    "no", "games", "games_started",
    "fg_made", "fg_att", "fg_pct",
    "fg3_made", "fg3_att", "fg3_pct",
    "ft_made", "ft_att", "ft_pct",
    "oreb", "dreb", "reb_total",
    "ast", "to", "ast_to_ratio",
    "stl", "blk", "pts", "tsp",
]


def _parse_player_id(href):
    match = re.search(r"playerID=(\d+)", href)
    return match.group(1) if match else None


def _clean_num(text):
    text = text.strip()
    if text == "":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def fetch_page(page_num):
    params = dict(PARAMS_BASE)
    if page_num > 1:
        params["ppageNum"] = page_num
    resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    # Le site ne déclare pas toujours son charset correctement dans le
    # Content-Type -> requests devine mal et on se retrouve avec du mojibake
    # sur les accents ("Canapé" -> "CanapÃ©"). La page est en réalité en
    # UTF-8 (vérifié : "Ã©" = "é" ré-encodé en UTF-8 puis mal décodé en
    # Latin-1), donc on force l'encodage plutôt que de laisser requests deviner.
    resp.encoding = "utf-8"
    return resp.text


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    players = []

    tables = soup.find_all("table")
    stats_table = None
    for t in tables:
        if t.find("a", href=re.compile(r"playerID=")):
            stats_table = t
            break

    if stats_table is None:
        return players

    rows = stats_table.find_all("tr")
    for row in rows:
        player_link = row.find("a", href=re.compile(r"playerID="))
        if not player_link:
            continue

        player_id = _parse_player_id(player_link["href"])
        player_name = player_link.get_text(strip=True)

        # Team détectée par la STRUCTURE de l'URL (".../teams/?u=XXXX")
        # plutôt que par le motif "u=AHBB", pour absorber les coquilles de
        # code équipe côté site (ex: "Ma Troupe De Titans" -> AHB- au lieu
        # de AHBB-).
        team_link = row.find_all("a", href=re.compile(r"/teams/\?u="))
        team_name = team_link[-1].get_text(strip=True) if team_link else None

        cells = row.find_all("td")
        cell_texts = [c.get_text(strip=True) for c in cells]

        numeric_cells = cell_texts[-(len(COLUMNS) - 1):]
        if len(numeric_cells) < len(COLUMNS) - 1:
            continue

        jersey_no = cell_texts[0].strip() if cell_texts else ""

        player = {
            "player_id": player_id,
            "name": player_name,
            "team": team_name,
            "jersey_no": jersey_no or None,
        }

        for col_name, raw_val in zip(COLUMNS[1:], numeric_cells):
            player[col_name] = _clean_num(raw_val)

        players.append(player)

    return players


def detect_total_pages(html):
    match = re.search(r"page\s+\d+\s+of\s+(\d+)", html, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 1


def scrape_all_players(delay_seconds=1.5):
    first_html = fetch_page(1)
    total_pages = detect_total_pages(first_html)

    all_players = parse_page(first_html)

    for page_num in range(2, total_pages + 1):
        time.sleep(delay_seconds)
        html = fetch_page(page_num)
        all_players.extend(parse_page(html))

    return all_players


if __name__ == "__main__":
    data = scrape_all_players()
    print(f"{len(data)} joueurs scrapes.")
    if data:
        print("Exemple:", data[0])
