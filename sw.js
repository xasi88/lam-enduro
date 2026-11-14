// Офлайн-работа и быстрый запуск приложения «XASI ENDURO».
//
// Как ускоряет: страница и файлы сайта берутся из копии в телефоне сразу, без сети.
// - Страница (index.html): из копии, а свежая качается в фоне и будет при следующем открытии.
// - js и css с номером версии (?v=..., его ставит выкладка, tools/versiya.py): не меняются
//   никогда, поэтому только из копии. Новая версия сайта = новые номера = новые файлы.
//   Копии старых номеров стираются, когда пришла новая страница.
// - Остальное (картинки, значки): из копии, свежее в фоне.
// - Шрифты Google: один раз скачать и дальше из копии.
// Данные таблиц сюда не идут: у них своя копия в памяти телефона (js/data.js).
const CACHE = "xasi-enduro-files";
const FONTS = "xasi-enduro-fonts";
const SHELL = ["manifest.webmanifest", "img/icon.svg", "img/icon-192.png"];
const VER = /[?&]v=(\w+)/;
const HOME = new URL("./", self.location).href;

/** Свои файлы с номером версии из страницы: script, link stylesheet и modulepreload. */
const versioned = (html) => [...html.matchAll(/(?:src|href)="([^"]+\?v=\w+)"/g)].map((m) => m[1]);

async function prune(cache, html) {
  const v = html.match(VER)?.[1];
  if (!v) return;
  for (const req of await cache.keys()) {
    const got = new URL(req.url).search.match(VER)?.[1];
    if (got && got !== v) await cache.delete(req);
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(HOME, { cache: "no-cache" });
    if (res.ok) {
      await cache.put(HOME, res.clone());
      await cache.addAll([...SHELL, ...versioned(await res.text())]).catch(() => {});
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => (k.startsWith("xasi-enduro-") || k.startsWith("lam-enduro-")) && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    const net = fetch(req, { cache: "no-cache" }).then(async (res) => {
      if (res.ok && url.href.split(/[?#]/)[0].replace(/index\.html$/, "") === HOME) {
        const cache = await caches.open(CACHE);
        const forText = res.clone();
        await cache.put(HOME, res.clone());
        forText.text().then((html) => prune(cache, html)).catch(() => {});
      }
      return res;
    });
    e.respondWith(caches.match(HOME).then((hit) => {
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }

  e.respondWith(caches.open(CACHE).then((cache) => cache.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { if (!VER.test(url.search)) e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })));
});
