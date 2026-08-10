import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";

export const revalidate = 60;

type TeamRecord = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export default async function LeagueClassementPage({
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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("league_id", league.id);

  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score, status")
    .eq("league_id", league.id)
    .eq("status", "completed");

  const records = new Map<string, TeamRecord>();
  for (const t of teams ?? []) {
    records.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  for (const g of games ?? []) {
    if (g.home_score === null || g.away_score === null) continue;

    const home = records.get(g.home_team_id);
    const away = records.get(g.away_team_id);
    if (!home || !away) continue;

    home.pointsFor += g.home_score;
    home.pointsAgainst += g.away_score;
    away.pointsFor += g.away_score;
    away.pointsAgainst += g.home_score;

    if (g.home_score > g.away_score) {
      home.wins += 1;
      away.losses += 1;
    } else if (g.away_score > g.home_score) {
      away.wins += 1;
      home.losses += 1;
    }
  }

  const standings = Array.from(records.values()).sort((a, b) => {
    const pctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
    const pctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
    if (pctB !== pctA) return pctB - pctA;
    return b.wins - a.wins;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Breadcrumb
        items={[
          { label: league.name, href: `/${slug}` },
          { label: "Classement" },
        ]}
      />
      <h1 className="font-display text-4xl text-bsh-orange mb-2 tracking-wide">
        {league.name}
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-10">
        <Link href={`/${slug}`} className="hover:text-bsh-orange">
          Équipes
        </Link>
        <Link href={`/${slug}/matchs`} className="hover:text-bsh-orange">
          Matchs
        </Link>
        <span className="text-bsh-gold font-semibold">Classement</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/20 text-white/50 uppercase">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Équipe</th>
              <th className="py-2 px-2 text-center">V</th>
              <th className="py-2 px-2 text-center">D</th>
              <th className="py-2 px-2 text-center">%</th>
              <th className="py-2 px-2 text-center">PP</th>
              <th className="py-2 px-2 text-center">PC</th>
              <th className="py-2 px-2 text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const total = s.wins + s.losses;
              const pct = total > 0 ? (s.wins / total) * 100 : 0;
              const diff = s.pointsFor - s.pointsAgainst;
              return (
                <tr key={s.teamId} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-bsh-gold font-display">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    {s.teamName}
                  </td>
                  <td className="py-3 px-2 text-center">{s.wins}</td>
                  <td className="py-3 px-2 text-center">{s.losses}</td>
                  <td className="py-3 px-2 text-center">
                    {total > 0 ? `${pct.toFixed(0)}%` : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {total > 0 ? s.pointsFor : "-"}
                  </td>
                  <td className="py-3 px-2 text-center text-white/60">
                    {total > 0 ? s.pointsAgainst : "-"}
                  </td>
                  <td
                    className={`py-3 px-2 text-center font-semibold ${
                      diff > 0
                        ? "text-green-400"
                        : diff < 0
                        ? "text-red-400"
                        : "text-white/60"
                    }`}
                  >
                    {total > 0 ? (diff > 0 ? `+${diff}` : diff) : "-"}
                  </td>
                </tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-white/50">
                  Aucune équipe pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
