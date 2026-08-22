"use client";

import { useState } from "react";
import Link from "next/link";

type Row = Record<string, unknown>;

type Column = {
  key: string;
  label: string;
  highlight?: boolean;
};

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

const POSITION_LABELS: Record<string, string> = {
  PG: "Meneur",
  SG: "Arrière",
  SF: "Ailier",
  PF: "Ailier fort",
  C: "Pivot",
};

function formatStat(value: unknown) {
  return value != null ? Number(value).toFixed(1) : "-";
}

export default function RankingsTable({
  rankings,
  columns,
  defaultPosition = "all",
}: {
  rankings: Row[];
  columns: Column[];
  defaultPosition?: string;
}) {
  const [position, setPosition] = useState<string>(defaultPosition);

  const filtered =
    position === "all" ? rankings : rankings.filter((r) => r.position === position);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setPosition("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            position === "all"
              ? "bg-bsh-orange text-black"
              : "bg-white/5 text-white/50 hover:bg-white/10"
          }`}
        >
          Toutes positions
        </button>
        {POSITIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPosition(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              position === p
                ? "bg-bsh-orange text-black"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {p} · {POSITION_LABELS[p]}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4">Poste</th>
                <th className="py-2 pr-4">Équipe</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2 px-2 text-center ${col.highlight ? "text-bsh-orange" : ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">{i + 1}</td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    {r.player_id && r.league_slug ? (
                      <Link
                        href={`/${String(r.league_slug)}/joueur/${String(r.player_id)}`}
                        className="hover:text-bsh-orange"
                      >
                        {String(r.player_name ?? "—")}
                      </Link>
                    ) : (
                      String(r.player_name ?? "—")
                    )}
                  </td>
                  <td className="py-3 pr-4 text-white/40 text-xs font-semibold">
                    {r.position ? String(r.position) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                    {String(r.team_name ?? "—")}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-2 text-center ${
                        col.highlight ? "text-bsh-orange font-bold" : "text-white/60"
                      }`}
                    >
                      {formatStat(r[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">
          {position === "all"
            ? "Pas encore de données disponibles."
            : "Aucun joueur à ce poste pour l'instant."}
        </p>
      )}
    </>
  );
}
