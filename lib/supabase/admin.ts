import { createClient } from "@supabase/supabase-js";

// Client Supabase "service role" -- bypass RLS, uniquement pour du code
// serveur de confiance qui doit lire/écrire sans être limité aux policies
// publiques (ex: envoyer une notif push à TOUS les abonnés, y compris ceux
// qui ne seraient pas lisibles via la policy "authenticated" de
// push_subscriptions). Ne JAMAIS importer ce fichier depuis un composant
// client ou l'exposer au navigateur -- la clé service_role donne un accès
// total à la base, RLS ou pas.
//
// SUPABASE_SERVICE_ROLE_KEY doit être ajoutée manuellement dans Vercel
// (Project Settings → Environment Variables) -- ce fichier ne peut pas le
// faire depuis cette session. Valeur à récupérer dans le dashboard Supabase :
// Project Settings → API → service_role secret key.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL) n'est pas configurée sur le serveur."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
