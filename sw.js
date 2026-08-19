const IS_PREVIEW = self.location.hostname.endsWith(".github.io");
const CACHE_NAME = "do-something-v2.7.1-v1.1-preview-2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles-1.css",
  "./styles-2.css",
  "./app-core-1.js",
  "./app-core-2.js",
  "./app-tasks-1.js",
  "./app-tasks-2.js",
  "./app-tasks-3.js",
  "./app-ui-1.js",
  "./app-ui-2.js",
  "./app-ui-3.js"
];

self.addEventListener("install", event => {
  if(IS_PREVIEW){
    event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))));
  }else{
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  }
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => IS_PREVIEW || key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  if(IS_PREVIEW){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request,copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
      const client=clients[0];
      if(client){ await client.focus(); return; }
      await self.clients.openWindow("./");
    })
  );
});
