import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import ArchivesSeasonPicker from "./ArchivesSeasonPicker";
import { seasonLabel, currentSeasonLabel } from "@/lib/season";

export const revalidate = 60;

export default async function ArchivesPage({
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

  const { data: games } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name)"
    )
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

  const allGames = games ?? [];
  const current = currentSeasonLabel();

  const pastSeasons = Array.from(
    new Set(
      allGames
        .map((g) => seasonLabel(g.game_date))
        .filter((s) => s !== current)
    )
  ).sort()
    .reverse();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league.name, href: `/${slug}` },
          { label: "Archives" },
        ]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        {league.name} — Archives
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-6">
        <Link href={`/${slug}`} className="hover:text-bsh-orange">
          Équipes
        </Link>
        {slug !== "ahbb" && (
          <Link href={`/${slug}/matchs`} className="hover:text-bsh-orange">
            Matchs
          </Link>
        )}
        <span className="text-bsh-gold font-semibold">Archives</span>
        {slug !== "ahbb" && (
          <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
            Classement
          </Link>
        )}
      </div>

      <ArchivesSeasonPicker
        slug={slug}
        games={allGames}
        pastSeasons={pastSeasons}
      />
    </div>
  );
}
