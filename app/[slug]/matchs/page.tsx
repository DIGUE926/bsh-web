import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import GamesList from "@/app/[slug]/GamesList";
import { seasonLabel, currentSeasonLabel } from "@/lib/season";

export const revalidate = 60;

export default async function MatchsPage({
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
  if (league.slug === "ahbb") notFound();

  const { data: games } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name)"
    )
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

  const current = currentSeasonLabel();
  const currentSeasonGames = (games ?? []).filter(
    (g) => seasonLabel(g.game_date) === current
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league.name, href: `/${slug}` },
          { label: "Matchs" },
        ]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        {league.name}
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-6">
        <Link href={`/${slug}`} className="hover:text-bsh-orange">
          Équipes
        </Link>
        <span className="text-bsh-gold font-semibold">Matchs</span>
        <Link href={`/${slug}/archives`} className="hover:text-bsh-orange">
          Archives
        </Link>
        {slug !== "ahbb" && (
          <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
            Classement
          </Link>
        )}
      </div>

      <GamesList
        slug={slug}
        games={currentSeasonGames}
        emptyMessage="Aucun match pour la saison en cours."
      />
    </div>
  );
}
