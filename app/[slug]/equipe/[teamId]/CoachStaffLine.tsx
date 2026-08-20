"use client";

import { useState } from "react";

export default function CoachStaffLine({
  headCoach,
  assistantCoach,
  wins,
  losses,
}: {
  headCoach: string | null;
  assistantCoach: string | null;
  wins: number;
  losses: number;
}) {
  const [open, setOpen] = useState(false);

  if (!headCoach && !assistantCoach) return null;

  const totalGames = wins + losses;
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : null;

  return (
    <div className="mb-6 -mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-white/70 hover:text-bsh-orange transition-colors text-left"
      >
        {headCoach && <>Coach : <span className="font-semibold underline decoration-white/30 underline-offset-2">{headCoach}</span></>}
        {headCoach && assistantCoach && "  ·  "}
        {assistantCoach && <>Assistant : <span className="font-semibold underline decoration-white/30 underline-offset-2">{assistantCoach}</span></>}
      </button>

      {open && (
        <p className="text-xs text-white/45 mt-1.5">
          {totalGames > 0 ? (
            <>
              Bilan de l&apos;équipe : <span className="text-bsh-gold font-semibold">{wins}V-{losses}D</span>
              {" "}({winPct}% de victoires)
            </>
          ) : (
            "Pas encore de match joué cette saison."
          )}
        </p>
      )}
    </div>
  );
}
