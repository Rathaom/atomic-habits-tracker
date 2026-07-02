const CACHE_NAME = "atomic-habits-v1-engine";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/themes.css",
  "./css/styles.css",
  "./js/firebase-config.js",
  "./js/notifications.js",
  "./js/export.js",
  "./js/dragdrop.js",
  "./js/calendar.js",
  "./js/charts.js",
  "./js/habits.js",
  "./js/ui.js",
  "./js/app.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Stale-While-Revalidate network asset optimization strategies
self.addEventListener("fetch", (e) => {
  // Bypass Firestore CDN transport queries safely from worker cache interventions
  if (e.request.url.includes("firestore.googleapis.com") || e.request.url.includes("gstatic.com")) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* Handle offline route suppressions cleanly */});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
