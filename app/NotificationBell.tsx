"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Bouton d'inscription aux notifications push pour les fans ("des
// parametres de notifs pour les fan qui aimeraient reste en contact",
// Digue 2026-08-31). Écrit/supprime directement dans push_subscriptions
// via les policies RLS publiques (insert/delete ouvertes à tous, voir la
// migration) -- pas besoin de route API pour l'abonnement lui-même, juste
// pour l'envoi (voir lib/webpush.ts).
type Status = "checking" | "unsupported" | "default" | "denied" | "subscribed" | "off";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function bufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str);
}

export default function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const existing = await registration?.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "default");
    }
    check();
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const p256dh = bufferToBase64(subscription.getKey("p256dh"));
      const auth = bufferToBase64(subscription.getKey("auth"));

      const { error } = await supabase
        .from("push_subscriptions")
        .insert({ endpoint: subscription.endpoint, p256dh, auth });
      // 23505 = endpoint déjà présent (resouscription sans désinscription
      // préalable) -- pas une vraie erreur, la ligne existe déjà tel quel.
      // Pas de policy UPDATE publique sur push_subscriptions (voir
      // migration), donc un upsert échouerait ici sous RLS -- insert simple
      // + tolérance du conflit à la place.
      if (error && error.code !== "23505") throw error;

      setStatus("subscribed");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <p className="px-3 py-2 text-[11px] text-white/35">
        🔕 Notifs bloquées -- autorise-les dans les réglages de ton navigateur pour ce site.
      </p>
    );
  }

  const subscribed = status === "subscribed";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        (subscribed ? unsubscribe() : subscribe()).then(() => onNavigate?.());
      }}
      className={`flex items-center gap-2 px-3 py-2 hover:bg-white/5 font-semibold text-xs disabled:opacity-50 ${
        subscribed ? "text-bsh-orange" : "text-white/90"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {subscribed ? "Notifs activées" : "Activer les notifs"}
    </button>
  );
}
