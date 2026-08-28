"use client";

import { useEffect } from "react";

// Enregistre le service worker (public/sw.js) côté client uniquement.
// Un échec ici (navigateur non compatible, SW désactivé) ne doit jamais
// casser le site — c'est un plus PWA, pas une dépendance.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // silencieux : le site marche normalement sans le SW
    });
  }, []);

  return null;
}
