"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type League = { id: string; slug: string; name: string };
type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: "post" | "league" | "season";
  league_id: string | null;
  active: boolean;
  created_at: string;
};

const TIER_LABELS: Record<Sponsor["tier"], string> = {
  post: "Palier 1 — Mention Post",
  league: "Palier 2 — Partenaire Ligue",
  season: "Palier 3 — Sponsor Titre Saison",
};

export default function SponsorsManager({
  initialSponsors,
  leagues,
  initialEnabled,
}: {
  initialSponsors: Sponsor[];
  leagues: League[];
  initialEnabled: boolean;
}) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [toggling, setToggling] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tier, setTier] = useState<Sponsor["tier"]>("post");
  const [leagueId, setLeagueId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function toggleGlobal() {
    setToggling(true);
    const next = !enabled;
    const { error } = await supabase
      .from("app_settings")
      .update({ value: next, updated_at: new Date().toISOString() })
      .eq("key", "sponsors_enabled");

    if (!error) {
      setEnabled(next);
      router.refresh();
    }
    setToggling(false);
  }

  async function addSponsor() {
    if (!name.trim()) {
      setError("Le nom du sponsor est requis.");
      return;
    }
    setError(null);
    setSaving(true);

    const { data, error } = await supabase
      .from("sponsors")
      .insert({
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        tier,
        league_id: tier === "league" ? leagueId || null : null,
        active: false,
      })
      .select()
      .single();

    if (error) {
      setError("Échec de l'ajout. Réessaie.");
    } else if (data) {
      setSponsors((prev) => [data as Sponsor, ...prev]);
      setName("");
      setLogoUrl("");
      setWebsiteUrl("");
      setTier("post");
      setLeagueId("");
    }
    setSaving(false);
  }

  async function toggleSponsor(id: string, current: boolean) {
    const { error } = await supabase
      .from("sponsors")
      .update({ active: !current })
      .eq("id", id);
    if (!error) {
      setSponsors((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !current } : s))
      );
    }
  }

  async function deleteSponsor(id: string) {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (!error) {
      setSponsors((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        SPONSORS
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Gère les sponsors affichés sur le site et active/désactive le bandeau
        « Nos partenaires » globalement, depuis ici.
      </p>

      <div
        className={`flex items-center justify-between gap-3 mb-6 border rounded-lg px-4 py-3 max-w-2xl ${
          enabled
            ? "border-green-500/40 bg-green-500/10"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div>
          <p className="text-sm font-semibold">
            Bandeau sponsors sur le site :{" "}
            <span className={enabled ? "text-green-400" : "text-white/50"}>
              {enabled ? "Activé" : "Désactivé"}
            </span>
          </p>
          <p className="text-xs text-white/50">
            {enabled
              ? "Les sponsors marqués « actif » ci-dessous s'affichent en bas de la page d'accueil."
              : "Rien ne s'affiche sur le site public, même si des sponsors sont marqués actifs ci-dessous."}
          </p>
        </div>
        <button
          onClick={toggleGlobal}
          disabled={toggling}
          className={`text-xs font-bold rounded px-3 py-2 whitespace-nowrap transition-opacity ${
            enabled
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-green-600 text-white hover:bg-green-500"
          } ${toggling ? "opacity-50" : ""}`}
        >
          {toggling ? "…" : enabled ? "Désactiver" : "Activer"}
        </button>
      </div>

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <p className="text-sm font-semibold text-white/80 mb-3">
          Ajouter un sponsor
        </p>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boutique X"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Palier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Sponsor["tier"])}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
            >
              <option value="post">Palier 1 — Mention Post</option>
              <option value="league">Palier 2 — Partenaire Ligue</option>
              <option value="season">Palier 3 — Sponsor Titre Saison</option>
            </select>
          </div>
          {tier === "league" && (
            <div>
              <label className="block text-xs text-white/40 mb-1">Ligue</label>
              <select
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
              >
                <option value="">— Choisir —</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-white/40 mb-1">
              Logo (URL image)
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://... (optionnel)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">
              Site web
            </label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://... (optionnel)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
            />
          </div>
        </div>
        <button
          onClick={addSponsor}
          disabled={saving}
          className="bg-bsh-orange text-black text-xs font-bold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Ajout..." : "Ajouter le sponsor"}
        </button>
      </div>

      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-white/80 mb-3">
          Sponsors ({sponsors.length})
        </p>
        {sponsors.length === 0 && (
          <p className="text-sm text-white/40">Aucun sponsor pour l&apos;instant.</p>
        )}
        <div className="space-y-2">
          {sponsors.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 border border-white/10 rounded-lg px-4 py-3 bg-white/5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{s.name}</p>
                <p className="text-xs text-white/40">{TIER_LABELS[s.tier]}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleSponsor(s.id, s.active)}
                  className={`text-xs font-bold rounded px-3 py-1.5 whitespace-nowrap ${
                    s.active
                      ? "bg-green-600 text-white hover:bg-green-500"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {s.active ? "Actif" : "Inactif"}
                </button>
                <button
                  onClick={() => deleteSponsor(s.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                >
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
