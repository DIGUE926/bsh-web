import { supabase } from "@/lib/supabase";
import ClassementTabs from "../ClassementTabs";

export const revalidate = 60;

export default async function ClassementBPGPage() {
  const { data: rankings, error } = await supabase
    .from("global_rankings")
    .select("*")
    .eq("league_slug", "suble")
    .order("bpg", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT SUBLE — BPG
      </h1>
      <p className="text-white/50 mb-6">
        Meilleurs en contres par match
      </p>

      <ClassementTabs />

      {rankings && rankings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4">Équipe</th>
                <th className="py-2 px-2 text-center text-bsh-orange">BPG</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    {String(r.player_name ?? "—")}
                  </td>
                  <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                    {String(r.team_name ?? "—")}
                  </td>
                  <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                    {r.bpg != null ? Number(r.bpg).toFixed(1) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">
          {error ? "Erreur de chargement des données." : "Pas encore de données disponibles."}
        </p>
      )}
    </div>
  );
}
