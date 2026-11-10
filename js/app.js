// Переходы между экранами по адресу после «#».
// #/            главная          #/g/<гонка>/<класс>  гонка
// #/s/<класс>   сезон            #/p                  пилоты     #/p/<ключ>  пилот
// #/new         что нового
import { RACES, LEAGUE } from "./races.js?v=1466f04a";
import { loadAll, loadRace } from "./data.js?v=1466f04a";
import { seasonTable } from "./domain/season.js?v=1466f04a";
import { homeView } from "./ui/home.js?v=1466f04a";
import { raceView, bindRace } from "./ui/race.js?v=1466f04a";
import { seasonView } from "./ui/season.js?v=1466f04a";
import { pilotsView, bindPilots, pilotView } from "./ui/pilots.js?v=1466f04a";
import { loading, failed } from "./ui/parts.js?v=1466f04a";
import { esc } from "./ui/format.js?v=1466f04a";
import { VERSIONS, VERSION } from "./version.js?v=1466f04a";

const app = document.getElementById("app");
const html = document.documentElement;
let timer = null, ticket = 0;

const seasonRaces = (all) => all.filter((d) => !d.error && d.season === LEAGUE.season);

function setNav(tab) {
  document.querySelectorAll("[data-tab]").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function setTitle(t) { document.title = t ? `${t} · ${LEAGUE.name}` : LEAGUE.name; }

async function route() {
  const my = ++ticket;
  clearInterval(timer); timer = null;
  const [, kind = "", a = "", b = ""] = location.hash.split("/").map(decodeURIComponent);
  html.removeAttribute("data-sponsor");
  window.scrollTo(0, 0);
  try {
    if (kind === "g") {
      setNav("races");
      const race = RACES.find((r) => r.id === a);
      if (!race) return notFound();
      if (race.sponsor) html.setAttribute("data-sponsor", race.sponsor.id);
      app.innerHTML = loading();
      const show = async (fresh) => {
        const d = await loadRace(race, { fresh });
        if (my !== ticket) return;
        const y = window.scrollY, q = app.querySelector("#q")?.value;
        app.innerHTML = raceView(d, b);
        bindRace(app, d);
        if (fresh) { window.scrollTo(0, y); if (q) { const i = app.querySelector("#q"); i.value = q; i.dispatchEvent(new Event("input")); } }
        setTitle(d.name);
        if (d.state === "live" && !timer) timer = setInterval(() => document.visibilityState === "visible" && show(true).catch(() => {}), 60000);
      };
      await show(false);
      return;
    }
    if (kind === "s" || kind === "p" || kind === "") {
      setNav(kind === "s" ? "season" : kind === "p" ? "pilots" : "races");
      app.innerHTML = loading();
      const all = await loadAll(RACES);
      if (my !== ticket) return;
      if (all.every((d) => d.error)) throw new Error("Нет данных");
      const season = seasonTable(seasonRaces(all));
      if (kind === "s") { app.innerHTML = seasonView(season, a || "gold", seasonRaces(all).length); setTitle("Сезон"); }
      else if (kind === "p" && a) { app.innerHTML = pilotView(seasonRaces(all), season, a); setTitle("Пилот"); }
      else if (kind === "p") { app.innerHTML = pilotsView(season); bindPilots(app); setTitle("Пилоты"); }
      else { app.innerHTML = homeView(all, season); setTitle(""); }
      return;
    }
    if (kind === "new") {
      setNav("");
      app.innerHTML = `<header class="page-head"><div class="wrap"><h1>Что нового</h1></div></header><section class="band band-tight"><div class="wrap">`
        + VERSIONS.map((v) => `<h3>Версия ${esc(v.v)} · ${esc(v.date)}</h3><ul class="news">${v.text.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`).join("")
        + `</div></section>`;
      setTitle("Что нового");
      return;
    }
    notFound();
  } catch (err) {
    if (my !== ticket) return;
    console.warn(err);
    app.innerHTML = failed();
  }
}

function notFound() {
  app.innerHTML = `<div class="wrap state-box"><p>Такой страницы нет.</p><a class="btn btn-ghost" href="#/">На главную</a></div>`;
}

app.addEventListener("click", (e) => {
  if (e.target.closest("[data-retry]")) { route(); return; }
  const j = e.target.closest("[data-jump]");
  if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
});
window.addEventListener("hashchange", route);
document.getElementById("ver").textContent = VERSION;
route();
