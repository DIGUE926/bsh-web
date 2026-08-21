import { supabase } from "@/lib/supabase";

const LIVE_SCORING_KEY = "live_scoring_enabled";
const SPONSORS_KEY = "sponsors_enabled";

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

/**
 * Interrupteur d'affichage des sponsors sur le site public (bandeau
 * "Nos partenaires" en bas de la page d'accueil). Contrairement au kill
 * switch Live, celui-ci est désactivé par défaut : pas de sponsor tant que
 * Digue ne l'active pas explicitement depuis /admin/sponsors.
 */
export async function isSponsorsEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SPONSORS_KEY)
    .single();

  if (error || !data) return false;
  return data.value === true;
}
