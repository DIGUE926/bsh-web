"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LeagueRequest = {
  id: string;
  league_name: string;
  city: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  team_count: string | null;
  player_count: string | null;
  league_status: "active" | "creation";
  years_active: string | null;
  social_link: string | null;
  message: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  created_at: string;
};

const STATUS_LABELS: Record<LeagueRequest["status"], string> = {
  pending: "En attente",
  reviewed: "Étudiée",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUS_COLORS: Record<LeagueRequest["status"], string> = {
  pending: "bg-white/10 text-white/60",
  reviewed: "bg-blue-500/20 text-blue-300",
  accepted: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
};

export default function LeagueRequestsList({
  initialRequests,
}: {
  initialRequests: LeagueRequest[];
}) {
  const [requests, setRequests] = useState<LeagueRequest[]>(initialRequests);
  const supabase = createClient();

  async function updateStatus(id: string, status: LeagueRequest["status"]) {
    const { error } = await supabase
      .from("league_requests")
      .update({ status })
      .eq("id", id);
    if (!error) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  async function deleteRequest(id: string) {
    const { error } = await supabase.from("league_requests").delete().eq("id", id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        DEMANDES D&apos;INTÉGRATION
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Ligues qui veulent rejoindre BSH, soumises via /rejoindre.
      </p>

      {requests.length === 0 && (
        <p className="text-sm text-white/40">Aucune demande pour l&apos;instant.</p>
      )}

      <div className="space-y-3 max-w-3xl">
        {requests.map((r) => (
          <div
            key={r.id}
            className="border border-white/10 rounded-lg p-4 bg-white/5"
          >
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <div>
                <p className="font-semibold text-white">{r.league_name}</p>
                <p className="text-xs text-white/40">{r.city}</p>
              </div>
              <span
                className={`text-xs font-bold rounded-full px-3 py-1 ${STATUS_COLORS[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70 mb-3">
              <p>
                <span className="text-white/40">Contact :</span> {r.contact_name}
              </p>
              <p>
                <span className="text-white/40">Téléphone :</span> {r.contact_phone}
              </p>
              {r.contact_email && (
                <p>
                  <span className="text-white/40">Email :</span> {r.contact_email}
                </p>
              )}
              <p>
                <span className="text-white/40">Statut :</span>{" "}
                {r.league_status === "active" ? "Déjà active" : "En cours de création"}
              </p>
              {r.team_count && (
                <p>
                  <span className="text-white/40">Équipes :</span> {r.team_count}
                </p>
              )}
              {r.player_count && (
                <p>
                  <span className="text-white/40">Joueurs :</span> {r.player_count}
                </p>
              )}
              {r.years_active && (
                <p>
                  <span className="text-white/40">Existe depuis :</span> {r.years_active}
                </p>
              )}
              {r.social_link && (
                <p className="truncate">
                  <span className="text-white/40">Lien :</span>{" "}
                  <a
                    href={r.social_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bsh-orange hover:underline"
                  >
                    {r.social_link}
                  </a>
                </p>
              )}
            </div>

            {r.message && (
              <p className="text-sm text-white/60 mb-3 border-l-2 border-white/10 pl-3">
                {r.message}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {(["pending", "reviewed", "accepted", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(r.id, s)}
                  disabled={r.status === s}
                  className={`text-xs font-semibold rounded px-2.5 py-1 ${
                    r.status === s
                      ? "bg-white/5 text-white/30 cursor-default"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              <button
                onClick={() => deleteRequest(r.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 ml-auto"
              >
                Suppr.
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
