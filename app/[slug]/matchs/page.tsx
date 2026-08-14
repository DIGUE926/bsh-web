import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import MatchsArchive from "./MatchsArchive";

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

  const { data: games } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name)"
    )
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

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
        <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
          Classement
        </Link>
      </div>

      <MatchsArchive slug={slug} games={games ?? []} />
    </div>
  );
}
