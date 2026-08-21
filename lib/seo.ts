import { supabase } from "@/lib/supabase";

/**
 * Minimal league lookup for generateMetadata() calls — separate from each
 * page's own data fetching (metadata runs in its own request), kept
 * lightweight (name only) on purpose.
 */
export async function getLeagueNameForSeo(slug: string): Promise<string | null> {
  const { data } = await supabase.from("leagues").select("name").eq("slug", slug).single();
  return data?.name ?? null;
}
