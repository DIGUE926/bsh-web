// BSH — service worker désactivé.
// La PWA (installable "Ajouter à l'écran d'accueil") a été retirée du site
// principal le 2026-08-28 à la demande de Digue — seule l'app bsh-scoreboard
// (déploiement séparé) reste installable désormais. Ce fichier n'est plus
// enregistré par aucune page (voir app/layout.tsx), mais un navigateur qui
// avait déjà installé l'ancienne version continuera de vérifier /sw.js
// périodiquement — ce script prend le relais pour s'auto-désinstaller
// proprement et vider le cache, plutôt que de laisser tourner l'ancienne
// version indéfiniment.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
