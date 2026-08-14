import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  game_id: string;
  player_id: string;
  action: "insert" | "update" | "delete";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by_email: string | null;
  changed_at: string;
};

const TRACKED_FIELDS = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "fgm",
  "fga",
  "ftm",
  "fta",
  "min",
] as const;

const ACTION_LABELS: Record<AuditRow["action"], string> = {
  insert: "Ajout",
  update: "Modification",
  delete: "Suppression",
};

const ACTION_COLORS: Record<AuditRow["action"], string> = {
  insert: "text-green-400 border-green-400/30 bg-green-400/10",
  update: "text-bsh-gold border-bsh-gold/30 bg-bsh-gold/10",
  delete: "text-red-400 border-red-400/30 bg-red-400/10",
};

function diffFields(row: AuditRow) {
  if (row.action === "insert") {
    const vals = row.new_values ?? {};
    return TRACKED_FIELDS.filter(
      (f) => vals[f] !== null && vals[f] !== undefined
    ).map((f) => ({ field: f, from: null, to: vals[f] }));
  }
  if (row.action === "delete") {
    const vals = row.old_values ?? {};
    return TRACKED_FIELDS.filter(
      (f) => vals[f] !== null && vals[f] !== undefined
    ).map((f) => ({ field: f, from: vals[f], to: null }));
  }
  // update
  const oldVals = row.old_values ?? {};
  const newVals = row.new_values ?? {};
  return TRACKED_FIELDS.filter((f) => oldVals[f] !== newVals[f]).map((f) => ({
    field: f,
    from: oldVals[f],
    to: newVals[f],
  }));
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; game?: string }>;
}) {
  const { player, game } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("stats_audit_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(200);

  if (player) query = query.eq("player_id", player);
  if (game) query = query.eq("game_id", game);

  const { data: logs, error } = await query;
  const rows = (logs ?? []) as AuditRow[];

  // Récupère les noms des joueurs et matchs concernés en une seule passe
  const playerIds = [...new Set(rows.map((r) => r.player_id))];
  const gameIds = [...new Set(rows.map((r) => r.game_id))];

  const [{ data: players }, { data: games }] = await Promise.all([
    playerIds.length
      ? supabase.from("players").select("id, name").in("id", playerIds)
      : Promise.resolve({ data: [] }),
    gameIds.length
      ? supabase
          .from("games")
          .select(
            "id, game_date, home_team:home_team_id(name), away_team:away_team_id(name)"
          )
          .in("id", gameIds)
      : Promise.resolve({ data: [] }),
  ]);

  const playerMap = new Map((players ?? []).map((p) => [p.id, p.name]));
  const gameMap = new Map(
    (games ?? []).map((g) => {
      const gg = g as unknown as {
        id: string;
        game_date: string;
        home_team: { name: string } | null;
        away_team: { name: string } | null;
      };
      return [
        gg.id,
        `${gg.home_team?.name ?? "?"} vs ${gg.away_team?.name ?? "?"} (${gg.game_date})`,
      ];
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          HISTORIQUE DES MODIFICATIONS
        </h1>
        <Link
          href="/admin"
          className="text-sm text-white/50 hover:text-bsh-orange"
        >
          ← Retour
        </Link>
      </div>

      {(player || game) && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-white/50">Filtré par :</span>
          {player && (
            <span className="bg-white/5 border border-white/10 rounded px-2 py-1">
              Joueur: {playerMap.get(player) ?? player}
            </span>
          )}
          {game && (
            <span className="bg-white/5 border border-white/10 rounded px-2 py-1">
              Match: {gameMap.get(game) ?? game}
            </span>
          )}
          <Link
            href="/admin/historique"
            className="text-bsh-orange hover:underline"
          >
            Effacer le filtre
          </Link>
        </div>
      )}

      {error && (
        <p className="text-red-400 mb-4">
          Erreur : la table stats_audit_log n&apos;existe peut-être pas
          encore. Exécute d&apos;abord le script SQL.
        </p>
      )}

      {rows.length === 0 && !error ? (
        <p className="text-white/50">Aucune modification enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const diffs = diffFields(row);
            return (
              <div
                key={row.id}
                className="border border-white/10 rounded-lg p-4 bg-white/5"
              >
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold uppercase border rounded px-2 py-0.5 ${ACTION_COLORS[row.action]}`}
                    >
                      {ACTION_LABELS[row.action]}
                    </span>
                    <Link
                      href={`/admin/historique?player=${row.player_id}`}
                      className="font-semibold hover:text-bsh-orange"
                    >
                      {playerMap.get(row.player_id) ?? row.player_id}
                    </Link>
                    <span className="text-white/30">·</span>
                    <Link
                      href={`/admin/historique?game=${row.game_id}`}
                      className="text-white/60 hover:text-bsh-orange text-sm"
                    >
                      {gameMap.get(row.game_id) ?? row.game_id}
                    </Link>
                  </div>
                  <div className="text-right text-xs text-white/40">
                    <p>{new Date(row.changed_at).toLocaleString("fr-FR")}</p>
                    {row.changed_by_email && <p>{row.changed_by_email}</p>}
                  </div>
                </div>

                {diffs.length > 0 ? (
                  <div className="flex flex-wrap gap-3 text-sm mt-2">
                    {diffs.map((d) => (
                      <div
                        key={d.field}
                        className="bg-black/30 rounded px-2 py-1"
                      >
                        <span className="text-white/40 uppercase">
                          {d.field}
                        </span>{" "}
                        {d.from !== null ? (
                          <span className="text-red-400">
                            {String(d.from)}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}{" "}
                        <span className="text-white/40">→</span>{" "}
                        {d.to !== null ? (
                          <span className="text-green-400">
                            {String(d.to)}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm">
                    Aucun changement de valeur détecté.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
