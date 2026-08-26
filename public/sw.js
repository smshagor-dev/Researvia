const CACHE = "researvia-public-v2";
const PUBLIC_FALLBACKS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FALLBACKS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "You have a new ResearVia notification." };
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : "ResearVia";
  const body = typeof payload.body === "string" && payload.body ? payload.body : "You have a new academic match.";
  const href = typeof payload.href === "string" && payload.href.startsWith("/") ? payload.href : "/dashboard/notifications";
  const notificationId = typeof payload.notificationId === "string" ? payload.notificationId : "";

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: notificationId ? `researvia-${notificationId}` : undefined,
    renotify: false,
    data: {
      href,
      notificationId,
      type: typeof payload.type === "string" ? payload.type : "",
      metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}
    }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawHref = event.notification.data && typeof event.notification.data.href === "string"
    ? event.notification.data.href
    : "/dashboard/notifications";
  const target = new URL(rawHref, self.location.origin);
  const safeTarget = target.origin === self.location.origin ? target.href : `${self.location.origin}/dashboard/notifications`;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("navigate" in client) await client.navigate(safeTarget);
      if ("focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(safeTarget);
    return undefined;
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated/private surfaces or API responses.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/onboarding")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }

  if (url.pathname === "/") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match("/")));
  }
});
