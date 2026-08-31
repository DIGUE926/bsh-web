import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Envoi de notifications push navigateur aux fans abonnés (voir
// app/NotificationBell.tsx pour l'inscription, public/push-sw.js pour la
// réception côté navigateur). Demande de Digue 2026-08-31 : "des parametres
// de notifs pour les fan qui aimeraient reste en contact".
//
// Variables d'env requises (à ajouter manuellement dans Vercel, cette
// session ne peut pas le faire) :
// - NEXT_PUBLIC_VAPID_PUBLIC_KEY : BNOa3ufUXX27q61Dcrf8IG-GDC3TbRE_sXmkE-TLkh7Mgzq4JMKi3b2JpAluDIScIuk0koymB9Di2GPnPT6LFRY
// - VAPID_PRIVATE_KEY            : MkJ2gr3muyBxsOyFdSwMDXNRuZn5zOcqAPsFUMoZIh8
// - SUPABASE_SERVICE_ROLE_KEY    : dashboard Supabase → Project Settings → API → service_role secret key
// - PUSH_CRON_SECRET             : 0539626444a9db72658fa1ddf777dd316d19cfdc8542c3f9231dd4396eef804e
//   (déjà câblée en dur côté SQL dans le trigger Postgres qui appelle
//   /api/push/notify -- garder la même valeur ici, sinon le trigger ne
//   pourra plus s'authentifier auprès de la route)
const VAPID_SUBJECT = "mailto:mpapincedric@gmail.com";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ne sont pas configurées sur le serveur."
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  removed: number;
  total: number;
};

// Envoie `payload` à tous les abonnés connus, et nettoie au passage les
// abonnements expirés/révoqués (404/410 -- le navigateur ou l'utilisateur a
// coupé la permission côté client, l'endpoint ne répondra plus jamais).
export async function sendPushToAll(payload: PushPayload): Promise<PushSendResult> {
  ensureConfigured();
  const admin = createAdminClient();

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) throw new Error("Lecture push_subscriptions échouée : " + error.message);
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, removed: 0, total: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, failed, removed: staleIds.length, total: subscriptions.length };
}
