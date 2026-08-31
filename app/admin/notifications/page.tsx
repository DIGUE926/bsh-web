import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isOwnerEmail } from "@/lib/adminAccess";
import AnnounceForm from "./AnnounceForm";

export const dynamic = "force-dynamic";

// Annonces push manuelles pour les grandes nouvelles (playoffs, finale,
// champion de saison...) -- "début de match" et "résultat final" sont eux
// automatiques via le trigger Postgres, pas besoin d'un bouton pour ça.
// Demande Digue 2026-08-31.
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isOwnerEmail(user?.email)) redirect("/admin");

  const { count } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        NOTIFICATIONS
      </h1>
      <p className="text-sm text-white/50 mb-6">
        {count ?? 0} fan{(count ?? 0) === 1 ? "" : "s"} abonné{(count ?? 0) === 1 ? "" : "s"} aux
        notifs push. Le début et la fin de chaque match déclenchent déjà une notif
        automatique -- ce formulaire sert pour les grandes annonces (playoffs, finale,
        champion de saison...).
      </p>
      <AnnounceForm />
    </div>
  );
}
