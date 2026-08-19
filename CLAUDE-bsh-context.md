# BSH-WEB — Project Memory for Claude Code

## What this is

BSH (BallsoHard / BallsoHardx2) is a sports data and media platform covering Haitian basketball leagues. `bsh-web` is the main Next.js + Supabase web app. Digue (GitHub: `DIGUE926`) is the sole developer, admin, and editorial voice.

- **Digue is also a player for PM Strong in AHBB.** This is a known dual role — he maintains editorial neutrality practices (public disclaimer, no favoritism in coverage). Don't flag this as a conflict; it's already handled deliberately.
- Digue studies psychology at CREFIMA alongside this — efficiency matters, avoid wasting his time with unnecessary back-and-forth.
- **Hard deadline: December (before the basketball season starts).** The platform needs to be fully ready by then.

## Leagues covered

- **SUBLE** (Saint-Marc Unity Basketball League Evolution) — 5 teams: Fleurenceau Legends, Louverture Hoopers, Pont Tambour Guardians, Pivert Ballers, Lasciri Dunkers. The original league the platform was built around.
- **AHBB** — confirmed joining bsh-web (multi-league migration is the current top priority, see below). Previously tracked in a separate repo, `ahbb-tracker` (Python scrapers + Discord bot integration, GitHub Actions only, no local terminal). That repo's data is **not yet merged** into bsh-web's Supabase.

## Brand identity (non-negotiable — never change without explicit instruction)

- Orange `#FF6B00`, black `#0D0D0D`, gold `#FFD60A`
- Typography: **Anton** (headers/display) + **Montserrat** (body)
- BSH = BallsoHard(x2). Never expand it as anything else.
- Visual direction: ESPN/US sports aesthetic — dark theme, dense layout, orange/gold accents.

## Current priorities, in order

1. **Multi-league migration (AHBB → bsh-web)** — confirmed, in progress.
   - ⚠️ Known blocker: the `playoff_games` table has **no `league_id` column**. This makes the migration a real schema migration, not a quick add. Plan accordingly (migration script, backfill, FK constraints, update all queries/pages that assume single-league).
   - `playoff_player_stats` likely has the same gap — verify before assuming otherwise.
2. **OCR for stats entry from screenshots** — not started yet. Needs a sample screenshot from Digue to calibrate the extraction prompt before building. Don't build blind; ask for the sample if it's not already in the repo/conversation.
3. **Home page cleanup** — abbreviate long team names, add team logos (not just text names) to the home page.

Everything else (Google Search Console setup, expanding the social share generator, advanced league sections) is **deferred to January or later** — don't prioritize or suggest working on these unless Digue explicitly asks.

## Tech stack & architecture

- **Frontend:** Next.js
- **Backend/DB:** Supabase (Postgres + Auth + real-time subscriptions)
- **Hosting:** Vercel, auto-deploys from `main`
- **Charts:** Recharts (used for player trend charts)
- **Live scoring:** event-driven `game_events` table, real-time via Supabase subscriptions, interactive half-court SVG (`CourtDiagram.tsx`), `LiveScoreboard.tsx`, undo logic, "QuickStart" match flow
- **Social share image generator:** 1080×1350 Canvas 2D, BSH branding (orange/black/gold, Anton + Montserrat), top-N stat selectors, live preview, PNG download. This is V1 infrastructure only — post-December, plan is multiple templates (match recap, player of the week, comparisons), varied narrative formats, and video/carousel formats.

### Known Supabase tables (non-exhaustive — verify current schema before major changes)

- `leagues`, `teams`, `players`, `games`, `player_game_stats` — core schema
- `playoff_games`, `playoff_player_stats` — separate playoff infrastructure (⚠️ missing `league_id`, see above)
- `game_events` — live game event log
- `app_settings` — feature flags (e.g. kill switch for "Scoreboard Live")
- `stats_audit_log` — paired with a Postgres trigger, feeds `/admin/historique`

### Features already built and shipped (don't rebuild — extend/integrate instead)

- Playoffs: bracket page, box scores, player stat leaders, team power rankings, admin pages
- Live game recording system (see above)
- Kill switch for Scoreboard Live feature (`app_settings`-backed)
- Static shot chart + play-by-play on public match pages
- Social share image generator (see above)
- Audit log system + `/admin/historique`
- Player trend charts (Recharts)
- Match history restructured: current season vs. `/archives` split
- Clickable player names across all ranking pages
- Persistent admin nav bar
- `/admin/changelog` page generated from git history
- Mobile redesign (ESPN/US sports aesthetic, dark theme)
- SEO/analytics groundwork: OpenGraph/Twitter metadata, dynamic `sitemap.ts`, `robots.ts`, Vercel Analytics active. **Google Search Console itself is not yet configured** (sitemap.xml/robots.txt are ready — just needs GSC setup, which is deferred anyway).
- PIR (Player Impact Rating) — composite stat, originally built for SUBLE
- ESPN-style admin interface with Supabase Auth
- Public match history, league standings, individual player pages, global nav

## Dev workflow — follow this exactly

1. Validate with **`npx tsc --noEmit`** — NOT `npm run build`. The build command requires Supabase credentials that may not be available in every workflow.
2. Push to `main` → Vercel auto-deploys. There's no separate staging step in this workflow.

## Style / working preferences

- Digue communicates casually, bilingual French/Creole. Match that register in commit messages, comments, or any user-facing copy unless told otherwise.
- He prefers direct, honest technical assessments over reassurance — if something's a bad idea or a schema is going to cause pain later, say so plainly.
- He's systems-thinking oriented — converts constraints into structured frameworks. Don't over-explain basics; he'll follow technical reasoning fine.
