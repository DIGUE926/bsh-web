// Barre de probabilité de victoire, basée sur le bilan V-D réel de chaque
// équipe en saison régulière (voir calcul dans app/page.tsx). Purement
// indicatif — pas une vraie prédiction statistique, juste un repère visuel
// façon "qui part favori".
export default function WinProbBar({
  homePct,
  awayPct,
  homeName,
  awayName,
}: {
  homePct: number;
  awayPct: number;
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
        <span className="font-semibold text-bsh-orange">{homePct}%</span>
        <span className="uppercase tracking-wide">Chances de victoire</span>
        <span className="font-semibold text-white/70">{awayPct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
        <div className="h-full bg-bsh-orange" style={{ width: `${homePct}%` }} />
        <div className="h-full bg-white/30" style={{ width: `${awayPct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/30 mt-1">
        <span className="truncate">{homeName}</span>
        <span className="truncate">{awayName}</span>
      </div>
    </div>
  );
}
