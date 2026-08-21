"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RejoindrePage() {
  const [leagueName, setLeagueName] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [teamCount, setTeamCount] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [leagueStatus, setLeagueStatus] = useState<"active" | "creation">("active");
  const [yearsActive, setYearsActive] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueName.trim() || !city.trim() || !contactName.trim() || !contactPhone.trim()) {
      setError("Merci de remplir tous les champs obligatoires (*).");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.from("league_requests").insert({
      league_name: leagueName.trim(),
      city: city.trim(),
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim() || null,
      team_count: teamCount.trim() || null,
      player_count: playerCount.trim() || null,
      league_status: leagueStatus,
      years_active: yearsActive.trim() || null,
      social_link: socialLink.trim() || null,
      message: message.trim() || null,
    });

    if (error) {
      setError("Échec de l'envoi. Réessaie dans un instant.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-bsh-orange mb-3 tracking-wide">
          DEMANDE ENVOYÉE
        </h1>
        <p className="text-white/60">
          Merci ! On va étudier ta demande et te recontacter directement au numéro que tu as
          fourni.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <p className="text-xs text-bsh-orange font-semibold uppercase tracking-wide mb-2">
        Rejoindre BSH
      </p>
      <h1 className="font-display text-2xl sm:text-3xl text-white mb-3 tracking-wide">
        Ta ligue veut rejoindre BSH ?
      </h1>
      <p className="text-white/50 text-sm mb-8">
        BSH couvre déjà SUBLE (Saint-Marc) et AHBB (Port-au-Prince). Si tu organises ou joues
        dans une autre ligue de basket amateur en Haïti et que tu veux être suivi sur la
        plateforme (classements, stats, visuels réseaux sociaux), remplis ce formulaire — on te
        recontacte pour discuter.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Nom de la ligue *</label>
            <input
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Ville / région *</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Ton nom (contact) *</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Numéro de téléphone *</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+509 ..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Email (optionnel)</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            La ligue est déjà active, ou en cours de création ?
          </label>
          <select
            value={leagueStatus}
            onChange={(e) => setLeagueStatus(e.target.value as "active" | "creation")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="active">Déjà active, on joue régulièrement</option>
            <option value="creation">En cours de création</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Nb. d&apos;équipes (approx.)</label>
            <input
              value={teamCount}
              onChange={(e) => setTeamCount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Nb. de joueurs (approx.)</label>
            <input
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Existe depuis (années)</label>
            <input
              value={yearsActive}
              onChange={(e) => setYearsActive(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            Lien réseaux sociaux / site de la ligue (optionnel)
          </label>
          <input
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">
            Dis-nous en plus sur ta ligue (optionnel)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-bsh-orange text-black font-bold rounded-lg px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Envoi..." : "Envoyer la demande"}
        </button>
      </form>
    </div>
  );
}
