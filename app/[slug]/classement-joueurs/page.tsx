import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import ClassementTabs from "./ClassementTabs";

export const revalidate = 60;

export default async function ClassementJoueursPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!league) notFound();

  const { data: rankings, error } = await supabase
    .from("global_rankings")
    .select("*")
    .eq("league_slug", slug)
    .order("pir", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: league.name, href: `/${slug}` }, { label: "Classement joueurs" }]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT {league.name.toUpperCase()}
      </h1>
      <p className="text-white/50 mb-6">
        Les joueurs les plus impactants, toutes stats confondues
      </p>

      <ClassementTabs slug={slug} />

      {rankings && rankings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4">Équipe</th>
                <th className="py-2 px-2 text-center">PPG</th>
                <th className="py-2 px-2 text-center">RPG</th>
                <th className="py-2 px-2 text-center">APG</th>
                <th className="py-2 px-2 text-center">SPG</th>
                <th className="py-2 px-2 text-center">BPG</th>
                <th className="py-2 px-2 text-center text-bsh-orange">Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">
                    {i + 1}
                  </td>
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
                  <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                    {String(r.team_name ?? "—")}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
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
                  <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                    {r.pir != null ? Number(r.pir).toFixed(1) : "—"}
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
