import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton côté navigateur : createClient() était appelé directement dans
// le corps de composants ("const supabase = createClient();"), ce qui
// recréait une instance -- donc une nouvelle référence d'objet -- à
// CHAQUE rendu. Tout useEffect qui avait `supabase` dans ses dépendances
// se re-déclenchait donc en boucle à chaque re-render, pas seulement au
// montage. Dans la plupart des écrans ça rechargeait juste les mêmes
// données en boucle silencieusement, mais dans Cinq de la saison l'effet
// rechargé remettait aussi la sélection de titulaires à zéro
// (setStarterIds([])) -- d'où "à chaque fois que j'ajoute ça se retire".
// Un singleton mémorisé règle le problème pour tous les écrans d'un coup,
// sans toucher chacun des ~25 fichiers qui appellent createClient().
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
