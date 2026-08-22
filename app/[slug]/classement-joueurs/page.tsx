import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import ClassementTabs from "./ClassementTabs";
import RankingsTable from "./RankingsTable";
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
  const title = `Classement joueurs ${name} — PPG, RPG, APG | BSH Basketball Haïti`;
  const description = `Le classement des meilleurs joueurs de la ligue ${name} en Haïti : points, rebonds, passes, interceptions et contres par match.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

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

      {error && <p className="text-white/50">Erreur de chargement des données.</p>}
      {!error && (
        <RankingsTable
          rankings={rankings ?? []}
          columns={[
            { key: "ppg", label: "PPG" },
            { key: "rpg", label: "RPG" },
            { key: "apg", label: "APG" },
            { key: "spg", label: "SPG" },
            { key: "bpg", label: "BPG" },
            { key: "pir", label: "Score", highlight: true },
          ]}
        />
      )}
    </div>
  );
}
