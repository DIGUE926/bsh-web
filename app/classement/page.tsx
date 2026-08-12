import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function ClassementGlobalPage() {
  const { data: rankings, error } = await supabase
    .from("global_rankings")
    .select("*")
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT SUBLE
      </h1>
      <p className="text-white/50 mb-6">
        Toutes ligues confondues, classé par PIR
      </p>

      {rankings && rankings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/20 text-white/50 text-sm uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4">Ligue</th>
                <th className="py-2 pr-4">PIR</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4 font-semibold">
                    {String(r.player_name ?? r.name ?? "—")}
                  </td>
                  <td className="py-3 pr-4 text-white/60">
                    {String(r.league_name ?? r.league ?? "—")}
                  </td>
                  <td className="py-3 pr-4 text-bsh-orange font-bold">
                    {String(r.pir ?? "—")}
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
