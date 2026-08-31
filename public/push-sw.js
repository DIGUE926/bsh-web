// BSH — service worker DÉDIÉ aux notifications push (fans qui veulent rester
// en contact, demande Digue 2026-08-31). Volontairement séparé de /sw.js
// (celui-là s'auto-désinstalle depuis le retrait de la PWA le 2026-08-28 --
// voir ce fichier) : celui-ci ne fait AUCUN cache, AUCUNE gestion offline,
// juste réception + affichage des push. Enregistré uniquement par
// app/NotificationBell.tsx, pas par app/layout.tsx.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "BSH";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
