import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import Avatar from "@/app/Avatar";
import U20Badge from "@/app/U20Badge";
import { getLeagueNameForSeo } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = await getLeagueNameForSeo(slug);
  if (!name) return {};
  const title = `${name} — Équipes, classement et stats | BSH Basketball Haïti`;
  const description = `Suivez la ligue ${name} sur BSH : équipes, classement, résultats et statistiques des joueurs, basketball en Haïti.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function LeaguePage({
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
    .select("*")
    .eq("league_id", league.id)
    .order("name");

  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("league_id", league.id)
    .eq("status", "completed");

  const records = new Map<string, { wins: number; losses: number }>();
  (teams ?? []).forEach((t) => records.set(t.id, { wins: 0, losses: 0 }));

  (games ?? []).forEach((g) => {
    if (g.home_score === null || g.away_score === null) return;
    const home = records.get(g.home_team_id);
    const away = records.get(g.away_team_id);
    if (!home || !away) return;
    if (g.home_score > g.away_score) {
      home.wins += 1;
      away.losses += 1;
    } else if (g.away_score > g.home_score) {
      away.wins += 1;
      home.losses += 1;
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: league.name }]} />
      <div className="flex items-center gap-3 mb-1">
        <Avatar
          name={league.name}
          src={league.logo_url}
          size={48}
          rounded="rounded-lg"
        />
        <h1 className="font-display text-lg sm:text-2xl text-bsh-orange tracking-wide flex items-center gap-2">
          {league.name}
          <U20Badge slug={league.slug} />
        </h1>
      </div>
      <div className="flex gap-4 text-sm text-white/50 mb-6">
        <span className="text-bsh-gold font-semibold">Équipes</span>
        {slug !== "ahbb" && (
          <Link href={`/${slug}/matchs`} className="hover:text-bsh-orange">
            Matchs
          </Link>
        )}
        {slug !== "ahbb" && (
          <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
            Classement
          </Link>
        )}
        <Link href={`/${slug}/classement-joueurs`} className="hover:text-bsh-orange">
          Classement joueurs
        </Link>
        <Link href={`/${slug}/playoffs`} className="hover:text-bsh-orange">
          Playoffs
        </Link>
      </div>

      <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
        ÉQUIPES
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {teams?.map((team) => {
          const record = records.get(team.id);
          const hasGames = record && record.wins + record.losses > 0;
          return (
            <Link
              key={team.id}
              href={`/${slug}/equipe/${team.id}`}
              className="border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={team.name} src={team.logo_url} size={36} rounded="rounded-lg" />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <h3 className="font-display text-sm truncate">{team.name}</h3>
                  {hasGames && (
                    <span className="text-xs font-semibold text-white/50 whitespace-nowrap ml-2">
                      {record!.wins}V-{record!.losses}D
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {(!teams || teams.length === 0) && (
          <p className="text-white/50">Aucune équipe pour le moment.</p>
        )}
      </div>
    </div>
  );
}
