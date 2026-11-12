// Офлайн-работа приложения «Лам Эндуро». Файлы сайта: сначала сеть, без сети копия.
// Данные таблиц сюда не идут: у них своя копия в памяти телефона (js/data.js).
const CACHE = "lam-enduro-v0.5.1";
const CORE = ["./", "index.html", "manifest.webmanifest", "css/tokens.css", "css/base.css", "css/screens.css", "css/motion.css",
  "js/app.js", "js/data.js", "js/races.js", "js/store.js", "js/version.js", "js/install.js",
  "js/domain/parse.js", "js/domain/results.js", "js/domain/season.js", "js/domain/skills.js",
  "js/ui/format.js", "js/ui/home.js", "js/ui/parts.js", "js/ui/pilots.js", "js/ui/race.js", "js/ui/race-more.js",
  "js/ui/season.js", "js/ui/settings.js", "js/ui/skills.js", "js/ui/rules.js", "js/ui/motion.js", "img/icon.svg", "img/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "no-cache" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("lam-enduro-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
