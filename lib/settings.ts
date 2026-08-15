import { supabase } from "@/lib/supabase";

const LIVE_SCORING_KEY = "live_scoring_enabled";

/**
 * Kill switch pour la feature Scoreboard Live.
 * Lit la table app_settings. Si la ligne n'existe pas (ex: avant migration),
 * on considère la feature activée par défaut pour ne rien casser.
 */
export async function isLiveScoringEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", LIVE_SCORING_KEY)
    .single();

  if (error || !data) return true;
  return data.value === true;
}
