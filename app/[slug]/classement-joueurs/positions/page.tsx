import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import ClassementTabs from "../ClassementTabs";
import RankingsTable from "../RankingsTable";
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
  const title = `Classement par position ${name} — PG, SG, SF, PF, C | BSH Basketball Haïti`;
  const description = `Le classement des joueurs de la ligue ${name} en Haïti, filtré par poste : meneur, arrière, ailier, ailier fort, pivot.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function ClassementPositionsPage({
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
    .limit(200);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league.name, href: `/${slug}` },
          { label: "Classement joueurs", href: `/${slug}/classement-joueurs` },
          { label: "Par position" },
        ]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT {league.name.toUpperCase()} : PAR POSITION
      </h1>
      <p className="text-white/50 mb-6">Filtre les joueurs par poste : PG, SG, SF, PF, C</p>

      <ClassementTabs slug={slug} />

      {error && <p className="text-white/50">Erreur de chargement des données.</p>}
      {!error && (
        <RankingsTable
          rankings={rankings ?? []}
          defaultPosition="PG"
          columns={[
            { key: "ppg", label: "PPG" },
            { key: "rpg", label: "RPG" },
            { key: "apg", label: "APG" },
            { key: "pir", label: "Score", highlight: true },
          ]}
        />
      )}
    </div>
  );
}
