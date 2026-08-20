import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://bsh-web-one.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: leagues } = await supabase.from("leagues").select("slug");
  const { data: teams } = await supabase
    .from("teams")
    .select("id, league:league_id(slug)");
  const { data: players } = await supabase
    .from("players")
    .select("id, team:team_id(league:league_id(slug))");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/live`, changeFrequency: "always", priority: 0.8 },
  ];

  const leagueRoutes: MetadataRoute.Sitemap = (leagues ?? []).flatMap((l) => [
    { url: `${BASE_URL}/${l.slug}`, changeFrequency: "daily" as const, priority: 0.8 },
    // Matchs et classement équipes sont désactivés pour l'AHBB (pas encore prêt, notFound()).
    ...(l.slug !== "ahbb"
      ? [
          { url: `${BASE_URL}/${l.slug}/matchs`, changeFrequency: "daily" as const, priority: 0.7 },
          { url: `${BASE_URL}/${l.slug}/classement`, changeFrequency: "daily" as const, priority: 0.7 },
        ]
      : []),
    { url: `${BASE_URL}/${l.slug}/classement-joueurs`, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE_URL}/${l.slug}/archives`, changeFrequency: "weekly" as const, priority: 0.5 },
    { url: `${BASE_URL}/${l.slug}/playoffs`, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${BASE_URL}/${l.slug}/playoffs/classement`, changeFrequency: "daily" as const, priority: 0.5 },
  ]);

  const teamRoutes: MetadataRoute.Sitemap = (
    teams as unknown as Array<{ id: string; league: { slug: string } | null }> ?? []
  )
    .filter((t) => t.league?.slug)
    .map((t) => ({
      url: `${BASE_URL}/${t.league!.slug}/equipe/${t.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const playerRoutes: MetadataRoute.Sitemap = (
    players as unknown as Array<{
      id: string;
      team: { league: { slug: string } | null } | null;
    }> ?? []
  )
    .filter((p) => p.team?.league?.slug)
    .map((p) => ({
      url: `${BASE_URL}/${p.team!.league!.slug}/joueur/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  return [...staticRoutes, ...leagueRoutes, ...teamRoutes, ...playerRoutes];
}
