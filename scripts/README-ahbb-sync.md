# Sync AHBB → bsh-web

Ce dossier synchronise les moyennes saison des joueurs AHBB (site officiel
ahbbayiti.com) vers Supabase, pour qu'elles apparaissent dans le classement
`/ahbb/classement-joueurs` sur bsh-web. Pas de suivi match par match (voir
`sync_ahbb_to_supabase.py` pour le pourquoi) — uniquement les moyennes
saison, comme le "Player Impact Ranking" déjà envoyé sur Discord par
ahbb-tracker.

## Setup (une seule fois)

**1. Créer la ligue AHBB + ses équipes dans Supabase**

Va sur [le SQL Editor du projet Supabase](https://supabase.com/dashboard/project/fkmcpeqcoaatgwzgyydh/sql/new),
colle le contenu de `setup-ahbb-league.sql`, et clique "Run". Ça prend 10
secondes, une seule fois.

**2. Ajouter 2 secrets sur le repo GitHub `bsh-web`**

Va dans `bsh-web` sur GitHub → Settings → Secrets and variables → Actions →
"New repository secret", et ajoute :

- `SUPABASE_URL` → `https://fkmcpeqcoaatgwzgyydh.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → récupérable dans le dashboard Supabase :
  Project Settings → API → section "Project API keys" → `service_role`
  (clique sur "Reveal" puis copie). **Ne partage jamais cette clé ailleurs**
  (elle contourne toutes les règles de sécurité de la base) — colle-la
  uniquement dans le champ secret GitHub, jamais dans un chat ou un fichier
  du repo.

**3. Lancer une première synchro manuelle**

Sur GitHub → onglet "Actions" → "Sync AHBB → Supabase" (dans la colonne de
gauche) → bouton "Run workflow" → "Run workflow". Ça scrape le site AHBB et
remplit les joueurs + leurs stats. Ensuite ça tourne tout seul toutes les 6h
(cron dans `.github/workflows/sync-ahbb.yml`).

## Fichiers

- `ahbb_scraper.py` — scraping du site officiel (repris de la logique déjà
  validée dans `ahbb-tracker/scraper.py`, avec un fix d'encodage UTF-8 en
  plus — le site renvoie du mojibake sinon sur les noms accentués).
- `sync_ahbb_to_supabase.py` — upsert des joueurs + moyennes saison dans
  Supabase (`players`, `imported_season_stats`).
- `setup-ahbb-league.sql` — setup one-shot (ligue + équipes).

## Tester en local sans rien écrire dans Supabase

```bash
pip install -r requirements.txt
python sync_ahbb_to_supabase.py --dry-run
```

Affiche les 10 premiers joueurs scrapés + la liste des équipes détectées,
sans toucher à la base.
