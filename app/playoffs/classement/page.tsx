import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Breadcrumb from "@/app/Breadcrumb";

export const revalidate = 60;

export default async function PlayoffClassementPage() {
  const { data: leaders } = await supabase
    .from("playoff_player_totals")
    .select("*")
    .order("ppg", { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: "Playoffs", href: "/playoffs" }, { label: "Leaders" }]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        LEADERS PLAYOFFS
      </h1>
      <p className="text-white/50 mb-6">Moyennes par match, playoffs uniquement</p>

      <div className="flex gap-2 mb-8 overflow-x-auto text-sm font-semibold">
        <Link
          href="/playoffs"
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Bracket
        </Link>
        <Link
          href="/playoffs/equipes"
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Équipes
        </Link>
        <span className="px-4 py-2 rounded-lg bg-bsh-orange text-black whitespace-nowrap">
          Leaders playoffs
        </span>
      </div>

      {leaders && leaders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4">Équipe</th>
                <th className="py-2 px-2 text-center">MJ</th>
                <th className="py-2 px-2 text-center">PPG</th>
                <th className="py-2 px-2 text-center">RPG</th>
                <th className="py-2 px-2 text-center">APG</th>
                <th className="py-2 px-2 text-center">SPG</th>
                <th className="py-2 px-2 text-center">BPG</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((r: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    <Link
                      href={`/suble/joueur/${r.player_id}`}
                      className="hover:text-bsh-orange"
                    >
                      {String(r.player_name ?? "—")}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                    {String(r.team_name ?? "—")}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {String(r.games_played ?? "-")}
                  </td>
                  <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                    {r.ppg != null ? Number(r.ppg).toFixed(1) : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {r.rpg != null ? Number(r.rpg).toFixed(1) : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {r.apg != null ? Number(r.apg).toFixed(1) : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {r.spg != null ? Number(r.spg).toFixed(1) : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {r.bpg != null ? Number(r.bpg).toFixed(1) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">
          Pas encore de stats playoffs disponibles.
        </p>
      )}
    </div>
  );
}
