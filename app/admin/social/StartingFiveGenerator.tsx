"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CANVAS_WIDTH as WIDTH,
  CANVAS_HEIGHT as HEIGHT,
  PADDING,
  COLORS,
  loadBrandFonts,
  paintBackground,
  paintCourtPattern,
  paintFittedPhoto,
  paintCompactHeader,
  paintFooter,
  downloadCanvasPng,
} from "@/lib/socialCanvas";

type Competition = "season" | "playoffs";
type League = { id: string; slug: string; name: string };
type PlayerRow = {
  player_id: string;
  player_name: string;
  team_name: string | null;
  position: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  pir: number | null;
  photo_url: string | null;
};

const MAX_STARTERS = 5;

export default function StartingFiveGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [roster, setRoster] = useState<PlayerRow[]>([]);
  const [rosterSearch, setRosterSearch] = useState("");
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, string>>({});
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);
  const [savedPhotoId, setSavedPhotoId] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadLeagues() {
      const { data } = await supabase.from("leagues").select("id, slug, name").order("name");
      if (data && data.length > 0) {
        setLeagues(data);
        setLeagueId(data[0].id);
      }
    }
    loadLeagues();
  }, [supabase]);

  // Recherche générale : tous les joueurs de la ligue, pas de notion
  // d'équipe -- c'est le cinq de départ de la saison, pas d'une équipe.
  useEffect(() => {
    if (!leagueId) return;
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return;
    async function loadRoster() {
      const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
      const { data } = await supabase
        .from(table)
        .select("player_id, player_name, team_name, position, ppg, rpg, apg, pir")
        .eq("league_slug", league!.slug)
        .order("player_name");
      const rows = (data ?? []) as Omit<PlayerRow, "photo_url">[];

      // global_rankings/playoff_player_totals n'exposent pas photo_url --
      // requête séparée sur players plutôt que de toucher à ces vues.
      const ids = rows.map((r) => r.player_id);
      const photosById = new Map<string, string | null>();
      if (ids.length > 0) {
        const { data: photoRows } = await supabase
          .from("players")
          .select("id, photo_url")
          .in("id", ids);
        (photoRows ?? []).forEach((p) => photosById.set(p.id, p.photo_url));
      }

      setRoster(rows.map((r) => ({ ...r, photo_url: photosById.get(r.player_id) ?? null })));
      setStarterIds([]);
      setRosterSearch("");
      setReady(false);
    }
    loadRoster();
  }, [leagueId, competition, leagues, supabase]);

  function toggleStarter(playerId: string) {
    setStarterIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= MAX_STARTERS) return prev;
      return [...prev, playerId];
    });
    setReady(false);
  }

  function photoDraftFor(player: PlayerRow) {
    return photoDrafts[player.player_id] ?? player.photo_url ?? "";
  }

  async function savePhoto(player: PlayerRow) {
    const value = photoDraftFor(player).trim();
    setError(null);
    setSavingPhotoId(player.player_id);
    const { error: updateError } = await supabase
      .from("players")
      .update({ photo_url: value || null })
      .eq("id", player.player_id);
    setSavingPhotoId(null);
    if (updateError) {
      setError(`Échec photo pour ${player.player_name} : ${updateError.message}`);
      return;
    }
    setRoster((prev) =>
      prev.map((p) => (p.player_id === player.player_id ? { ...p, photo_url: value || null } : p))
    );
    setSavedPhotoId(player.player_id);
    setReady(false);
  }

  async function uploadPhoto(player: PlayerRow, file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Le fichier choisi n'est pas une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (5 Mo max).");
      return;
    }

    setUploadingPhotoId(player.player_id);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${player.player_id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingPhotoId(null);
      setError(`Échec de l'import pour ${player.player_name} : ${uploadError.message}`);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("player-photos").getPublicUrl(path);
    const url = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("players")
      .update({ photo_url: url })
      .eq("id", player.player_id);
    setUploadingPhotoId(null);
    if (updateError) {
      setError(`Échec photo pour ${player.player_name} : ${updateError.message}`);
      return;
    }

    setRoster((prev) =>
      prev.map((p) => (p.player_id === player.player_id ? { ...p, photo_url: url } : p))
    );
    setPhotoDrafts((prev) => ({ ...prev, [player.player_id]: url }));
    setSavedPhotoId(player.player_id);
    setReady(false);
  }

  async function generate() {
    setError(null);
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      setError("Sélectionne une ligue.");
      return;
    }
    if (starterIds.length !== MAX_STARTERS) {
      setError(`Choisis exactement ${MAX_STARTERS} joueurs.`);
      return;
    }

    setLoading(true);
    const contextLabel = `${league.slug.toUpperCase()} · ${
      competition === "season" ? "SAISON RÉGULIÈRE" : "PLAYOFFS"
    }`;
    const starters = starterIds
      .map((id) => roster.find((p) => p.player_id === id))
      .filter((p): p is PlayerRow => !!p);

    await drawStartingFive(league, starters, contextLabel);
    setLoading(false);
    setReady(true);
  }

  async function drawStartingFive(league: League, starters: PlayerRow[], contextLabel: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.1);

    // Halo doré discret derrière le titre, pour donner un peu de relief à
    // l'affiche avant même le texte.
    const glow = ctx.createRadialGradient(WIDTH / 2, 170, 0, WIDTH / 2, 170, 420);
    glow.addColorStop(0, "rgba(255,214,10,0.10)");
    glow.addColorStop(1, "rgba(255,214,10,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, 420);

    paintCompactHeader(ctx, "CINQ DE LA SAISON", contextLabel, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    const centerX = WIDTH / 2;

    // Pastille "STARTING FIVE" au lieu d'un simple kicker texte.
    ctx.font = "800 18px Montserrat, sans-serif";
    const tagText = "STARTING FIVE";
    const tagW = ctx.measureText(tagText).width + 36;
    const tagX = centerX - tagW / 2;
    const tagY = 108;
    ctx.fillStyle = "rgba(255,107,0,0.14)";
    ctx.strokeStyle = "rgba(255,107,0,0.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, tagX, tagY, tagW, 34, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.orange;
    ctx.fillText(tagText, centerX, tagY + 23);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 46px Anton, sans-serif";
    const nameLines = wrapLines(ctx, league.name.toUpperCase(), WIDTH - PADDING * 2 - 60);
    let ny = 200;
    nameLines.forEach((line) => {
      ctx.fillText(line, centerX, ny);
      ny += 48;
    });

    // Trait d'accent dégradé sous le nom de la ligue.
    const underlineW = 90;
    const underlineY = ny + 10;
    const underlineGrad = ctx.createLinearGradient(
      centerX - underlineW / 2,
      0,
      centerX + underlineW / 2,
      0
    );
    underlineGrad.addColorStop(0, "rgba(255,107,0,0)");
    underlineGrad.addColorStop(0.5, COLORS.gold);
    underlineGrad.addColorStop(1, "rgba(255,107,0,0)");
    ctx.fillStyle = underlineGrad;
    ctx.fillRect(centerX - underlineW / 2, underlineY, underlineW, 3);

    const rows = 5;
    const startY = underlineY + 46;
    const gap = 18;
    const rowH = (HEIGHT - startY - 180 - gap * (rows - 1)) / rows;

    for (let i = 0; i < starters.length; i++) {
      const p = starters[i];
      const y = startY + i * (rowH + gap);

      // Ombre douce simulée (rects décalés, alpha dégressif) pour un effet
      // de carte "posée" plutôt que plate.
      for (let s = 3; s >= 1; s--) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 * s})`;
        roundRect(ctx, PADDING, y + s * 2, WIDTH - PADDING * 2, rowH, 18);
        ctx.fill();
      }

      // Carte avec léger dégradé + accent orange->or sur le bord gauche.
      const cardGrad = ctx.createLinearGradient(PADDING, y, WIDTH - PADDING, y);
      cardGrad.addColorStop(0, "rgba(255,255,255,0.065)");
      cardGrad.addColorStop(1, "rgba(255,255,255,0.035)");
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH, 18);
      ctx.clip();
      const accentGrad = ctx.createLinearGradient(0, y, 0, y + rowH);
      accentGrad.addColorStop(0, COLORS.gold);
      accentGrad.addColorStop(1, COLORS.orange);
      ctx.fillStyle = accentGrad;
      ctx.fillRect(PADDING, y, 5, rowH);
      ctx.restore();

      // Portrait carré à coins arrondis à gauche, ou avatar dégradé avec
      // initiales si aucune photo n'est renseignée.
      const photoSize = rowH - 20;
      const photoX = PADDING + 20;
      const photoY = y + (rowH - photoSize) / 2;

      if (p.photo_url) {
        await paintFittedPhoto(ctx, p.photo_url, photoX, photoY, photoSize, photoSize, 14);
      } else {
        const grad = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
        grad.addColorStop(0, "rgba(255,107,0,0.35)");
        grad.addColorStop(1, "rgba(255,214,10,0.18)");
        ctx.fillStyle = grad;
        roundRect(ctx, photoX, photoY, photoSize, photoSize, 14);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "900 30px Anton, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(p.player_name), photoX + photoSize / 2, photoY + photoSize / 2 + 2);
        ctx.textBaseline = "alphabetic";
      }

      // Fin liseré doré autour du portrait pour le détacher de la carte.
      ctx.strokeStyle = "rgba(255,214,10,0.35)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, photoX, photoY, photoSize, photoSize, 14);
      ctx.stroke();

      // Badge numéroté, chevauche le coin bas-droit du portrait.
      const badgeR = 18;
      const badgeCx = photoX + photoSize - 2;
      const badgeCy = photoY + photoSize - 2;
      ctx.beginPath();
      ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.orange;
      ctx.fill();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.black;
      ctx.font = "900 18px Anton, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), badgeCx, badgeCy + 1);
      ctx.textBaseline = "alphabetic";

      // Nom + équipe + poste
      const textX = photoX + photoSize + 24;
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.white;
      ctx.font = "800 25px Montserrat, sans-serif";
      ctx.fillText(p.player_name, textX, y + rowH / 2 - 12);

      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "600 14px Montserrat, sans-serif";
      ctx.fillText(p.team_name ?? "", textX, y + rowH / 2 + 8);

      if (p.position) {
        const pillW = ctx.measureText(p.position).width + 20;
        const pillY = y + rowH / 2 + 16;
        ctx.fillStyle = "rgba(255,214,10,0.15)";
        roundRect(ctx, textX, pillY, pillW, 22, 11);
        ctx.fill();
        ctx.fillStyle = COLORS.gold;
        ctx.font = "800 12px Montserrat, sans-serif";
        ctx.fillText(p.position, textX + 10, pillY + 15);
      }

      // Stats à droite : PTS / REB / AST / IMPACT
      const statBlocks: { label: string; value: string; accent?: boolean }[] = [
        { label: "PTS", value: p.ppg != null ? p.ppg.toFixed(1) : "-" },
        { label: "REB", value: p.rpg != null ? p.rpg.toFixed(1) : "-" },
        { label: "AST", value: p.apg != null ? p.apg.toFixed(1) : "-" },
        { label: "IMPACT", value: p.pir != null ? p.pir.toFixed(1) : "-", accent: true },
      ];
      const statW = 74;
      const statsRightX = WIDTH - PADDING - 24;
      statBlocks.forEach((s, si) => {
        const sx = statsRightX - (statBlocks.length - 1 - si) * statW;
        ctx.textAlign = "center";
        ctx.fillStyle = s.accent ? COLORS.gold : COLORS.white;
        ctx.font = "800 22px Montserrat, sans-serif";
        ctx.fillText(s.value, sx, y + rowH / 2 - 4);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "700 10px Montserrat, sans-serif";
        ctx.fillText(s.label, sx, y + rowH / 2 + 16);
      });
    }

    // Trait d'accent bas, écho de celui sous le titre.
    const bottomLineY = startY + rows * rowH + (rows - 1) * gap + 34;
    const bottomLineGrad = ctx.createLinearGradient(
      centerX - underlineW / 2,
      0,
      centerX + underlineW / 2,
      0
    );
    bottomLineGrad.addColorStop(0, "rgba(255,214,10,0)");
    bottomLineGrad.addColorStop(0.5, "rgba(255,214,10,0.4)");
    bottomLineGrad.addColorStop(1, "rgba(255,214,10,0)");
    ctx.fillStyle = bottomLineGrad;
    ctx.fillRect(centerX - underlineW / 2, bottomLineY, underlineW, 2);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const league = leagues.find((l) => l.id === leagueId);
    downloadCanvasPng(canvas, `bsh-${league?.slug ?? "ligue"}-cinq-de-la-saison.png`);
  }

  const query = rosterSearch.trim().toLowerCase();
  const visibleRoster = query
    ? roster.filter((p) => p.player_name.toLowerCase().includes(query))
    : roster;

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        CINQ DE LA SAISON
      </h1>
      <p className="text-sm text-white/50 mb-6 max-w-xl">
        Cherche et choisis manuellement les 5 meilleurs joueurs de la saison, toutes équipes
        confondues — une seule image générée avec leurs stats.
      </p>

      <div className="flex flex-wrap gap-4 mb-6 max-w-2xl">
        <div>
          <label className="block text-sm text-white/60 mb-1">Ligue</label>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Compétition</label>
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value as Competition)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="season">Saison régulière</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Titulaires ({starterIds.length}/{MAX_STARTERS})
          </p>
          <input
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            placeholder="Rechercher un joueur..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder:text-white/30 focus:border-bsh-orange outline-none w-full sm:w-56"
          />
        </div>
        {roster.length === 0 && (
          <p className="text-xs text-white/30">Aucun joueur avec des stats pour cette ligue.</p>
        )}
        {roster.length > 0 && visibleRoster.length === 0 && (
          <p className="text-xs text-white/30">Aucun joueur ne correspond à &quot;{rosterSearch}&quot;.</p>
        )}
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {visibleRoster.map((p) => {
            const selected = starterIds.includes(p.player_id);
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => toggleStarter(p.player_id)}
                disabled={!selected && starterIds.length >= MAX_STARTERS}
                className={`w-full flex items-center justify-between gap-2 text-left text-sm rounded px-3 py-2 border transition-colors disabled:opacity-30 ${
                  selected
                    ? "border-bsh-orange bg-bsh-orange/10 text-bsh-orange font-semibold"
                    : "border-white/10 text-white/70 hover:border-white/25"
                }`}
              >
                <span>
                  {p.player_name}
                  {p.team_name ? ` · ${p.team_name}` : ""}
                  {p.position ? ` · ${p.position}` : ""}
                </span>
                <span className="text-xs text-white/40 shrink-0">
                  {p.ppg != null ? `${p.ppg.toFixed(1)} PTS` : "-"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {starterIds.length > 0 && (
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-white/80 mb-1">Photos des titulaires choisis</p>
          <p className="text-xs text-white/40 mb-3">
            Importe une photo depuis ton ordinateur, ou colle une URL — utilisée dans l&apos;image
            générée et sur la page publique du joueur.
          </p>
          <div className="space-y-1.5">
            {starterIds.map((id) => {
              const player = roster.find((p) => p.player_id === id);
              if (!player) return null;
              const draft = photoDraftFor(player);
              const dirty = draft.trim() !== (player.photo_url ?? "");
              const uploading = uploadingPhotoId === id;
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-sm text-white/70 w-full sm:w-40 shrink-0 truncate">
                    {player.player_name}
                  </span>
                  <input
                    value={draft}
                    onChange={(e) => {
                      setPhotoDrafts((prev) => ({ ...prev, [id]: e.target.value }));
                      setSavedPhotoId(null);
                    }}
                    placeholder="URL photo joueur"
                    className="flex-1 min-w-[160px] bg-transparent border-b border-white/10 px-1 py-1 text-xs text-white/60 placeholder:text-white/25 focus:border-bsh-orange outline-none"
                  />
                  <button
                    onClick={() => savePhoto(player)}
                    disabled={!dirty || savingPhotoId === id || uploading}
                    className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 bg-white/5 text-white/40 hover:text-bsh-orange disabled:opacity-30 disabled:hover:text-white/40"
                  >
                    {savingPhotoId === id
                      ? "..."
                      : savedPhotoId === id && !dirty
                        ? "✓"
                        : "Enregistrer"}
                  </button>
                  <label
                    className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 bg-bsh-orange/10 text-bsh-orange cursor-pointer hover:bg-bsh-orange/20 ${
                      uploading ? "opacity-40 pointer-events-none" : ""
                    }`}
                  >
                    {uploading ? "Import..." : "Importer un fichier"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) uploadPhoto(player, file);
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={loading || starterIds.length !== MAX_STARTERS}
          className="bg-bsh-orange text-black font-bold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer l'image"}
        </button>
        {ready && (
          <button
            onClick={downloadImage}
            className="bg-white/10 text-white font-bold rounded-lg px-5 py-2.5 hover:bg-white/20 transition-colors"
          >
            Télécharger
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 inline-block">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="max-w-full h-auto rounded"
          style={{ width: "min(100%, 380px)", display: ready ? "block" : "none" }}
        />
        {!ready && (
          <div style={{ width: "min(100%, 380px)" }}>
            <p className="text-xs text-white/40 mt-2 text-center">
              L&apos;aperçu apparaît ici après génération.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
