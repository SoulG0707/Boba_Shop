const CACHE_NAME = "tea-nho-static-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./img/tea-cup.svg",
  "./css/reset.css",
  "./css/variables.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/game.css",
  "./js/config.js",
  "./js/main.js",
  "./js/data/ingredients.js",
  "./js/data/products.js",
  "./js/data/upgrades.js",
  "./js/data/employees.js",
  "./js/data/events.js",
  "./js/state/initialState.js",
  "./js/state/store.js",
  "./js/state/persistence.js",
  "./js/systems/inventory.js",
  "./js/systems/economy.js",
  "./js/systems/customers.js",
  "./js/systems/orders.js",
  "./js/systems/onlineOrders.js",
  "./js/systems/reviews.js",
  "./js/systems/upgrades.js",
  "./js/systems/employees.js",
  "./js/systems/events.js",
  "./js/systems/modifiers.js",
  "./js/systems/dayCycle.js",
  "./js/systems/audioManager.js",
  "./js/ui/helpers.js",
  "./js/ui/router.js",
  "./js/ui/header.js",
  "./js/ui/modal.js",
  "./js/ui/toast.js",
  "./js/ui/dashboard.js",
  "./js/ui/inventoryView.js",
  "./js/ui/upgradesView.js",
  "./js/ui/pricesView.js",
  "./js/ui/gameplayView.js",
  "./js/ui/reviewsView.js",
  "./js/ui/statsView.js",
  "./js/backup/backup.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const staticPaths = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));
  if (!staticPaths.has(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
