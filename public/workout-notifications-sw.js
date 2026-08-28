self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(payload.title || "Почивката приключи", {
    body: payload.body || "Време е за следващата серия.",
    icon: "/images/pegas-friend.png",
    badge: "/images/pegas-friend.png",
    tag: "pegasos-rest-timer",
    data: { url: payload.url || "/workouts" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/workouts";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => "focus" in client);
    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
