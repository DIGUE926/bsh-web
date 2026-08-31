export type PlayByPlayEvent = {
  id: string;
  event_type: "2PT" | "3PT" | "FT" | "REB" | "AST";
  made: boolean | null;
  period: number | null;
  created_at: string;
  player: {
    name: string;
    jersey_number: number | null;
    team_id: string;
  } | null;
};

function describe(ev: PlayByPlayEvent): string {
  const who = ev.player
    ? `#${ev.player.jersey_number ?? "-"} ${ev.player.name}`
    : "Joueur inconnu";

  switch (ev.event_type) {
    case "2PT":
      return `${who} : panier à 2 points ${ev.made ? "réussi" : "manqué"}`;
    case "3PT":
      return `${who} : panier à 3 points ${ev.made ? "réussi" : "manqué"}`;
    case "FT":
      return `${who} : lancer franc ${ev.made ? "réussi" : "manqué"}`;
    case "REB":
      return `${who} : rebond`;
    case "AST":
      return `${who} : passe décisive`;
    default:
      return who;
  }
}

export default function PlayByPlay({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: {
  events: PlayByPlayEvent[];
  homeTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Pas encore d&apos;actions enregistrées pour ce match.
      </p>
    );
  }

  // Plus récent en premier
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
      {sorted.map((ev) => {
        const isHome = ev.player?.team_id === homeTeamId;
        return (
          <div
            key={ev.id}
            className="flex items-center justify-between text-sm border-b border-white/5 py-1.5"
          >
            <span
              className={`text-xs uppercase tracking-wide w-8 shrink-0 ${
                isHome ? "text-bsh-orange" : "text-bsh-gold"
              }`}
              title={isHome ? homeTeamName : awayTeamName}
            >
              Q{ev.period ?? 1}
            </span>
            <span className="flex-1 text-white/80">{describe(ev)}</span>
            {(ev.event_type === "2PT" || ev.event_type === "3PT" || ev.event_type === "FT") && (
              <span className={ev.made ? "text-green-400" : "text-red-400"}>
                {ev.made ? "✓" : "✗"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
