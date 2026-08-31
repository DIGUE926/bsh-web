import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import ClassementTabs from "../ClassementTabs";
import RankingsTable from "../RankingsTable";

export const revalidate = 60;

export default async function ClassementJoueursRPGPage({
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
    .order("rpg", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: league.name, href: `/${slug}` }, { label: "Classement joueurs : RPG" }]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT {league.name.toUpperCase()} : RPG
      </h1>
      <p className="text-white/50 mb-6">
        Meilleurs en rebonds par match
      </p>

      <ClassementTabs slug={slug} />

      {error && <p className="text-white/50">Erreur de chargement des données.</p>}
      {!error && (
        <RankingsTable
          rankings={rankings ?? []}
          columns={[{ key: "rpg", label: "RPG", highlight: true }]}
        />
      )}
    </div>
  );
}
