// Переходы между экранами по адресу после «#». Нижний бар: Гонки, Сезон, Профиль.
// #/                    гонки по годам     #/g/<гонка>/<класс>  гонка
// #/s/<год>/<класс>     сезон              #/me                 мой профиль или выбор себя
// #/p                   все пилоты         #/p/<ключ>           пилот
// #/settings            настройки          #/new                что нового
import { RACES, LEAGUE } from "./races.js?v=9215d078";
import { loadAll, loadRace } from "./data.js?v=9215d078";
import { seasonTable, seasonsOf } from "./domain/season.js?v=9215d078";
import { homeView } from "./ui/home.js?v=9215d078";
import { raceView, bindRace } from "./ui/race.js?v=9215d078";
import { seasonView } from "./ui/season.js?v=9215d078";
import { pilotsView, bindPilots, pilotView } from "./ui/pilots.js?v=9215d078";
import { settingsView, newsView } from "./ui/settings.js?v=9215d078";
import { loading, failed } from "./ui/parts.js?v=9215d078";
import { me, theme } from "./store.js?v=9215d078";

const app = document.getElementById("app");
const html = document.documentElement;
let timer = null, ticket = 0;

const seasonRaces = (all, year = LEAGUE.season) => all.filter((d) => !d.error && d.season === year);

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
    if (kind === "settings") {
      setNav("settings");
      app.innerHTML = settingsView(theme.get(), me.get() && me.name());
      setTitle("Настройки");
      return;
    }
    if (kind === "new") {
      setNav("");
      app.innerHTML = newsView();
      setTitle("Что нового");
      return;
    }
    if (kind === "s" || kind === "p" || kind === "me" || kind === "") {
      setNav(kind === "s" ? "season" : kind === "" ? "races" : "me");
      app.innerHTML = loading();
      const all = await loadAll(RACES);
      if (my !== ticket) return;
      if (all.every((d) => d.error)) throw new Error("Нет данных");
      if (kind === "s") {
        const years = seasonsOf(RACES, LEAGUE.season);
        const isYear = /^\d{4}$/.test(a);
        const year = isYear && years.includes(Number(a)) ? Number(a) : (years.includes(LEAGUE.season) ? LEAGUE.season : years[0]);
        const list = seasonRaces(all, year);
        app.innerHTML = seasonView({ season: seasonTable(list), clsId: isYear ? b : a, year, years, raceCount: list.length });
        setTitle(`Сезон ${year}`);
        return;
      }
      const season = seasonTable(seasonRaces(all));
      const mine = me.get();
      const key = kind === "me" ? mine : a;
      if (key && (kind === "me" || kind === "p")) { app.innerHTML = pilotView(all.filter((d) => !d.error), season, key, key === mine); setTitle(key === mine ? "Мой профиль" : "Пилот"); }
      else if (kind === "p" || kind === "me") { app.innerHTML = pilotsView(season); bindPilots(app); setTitle("Профиль"); }
      else { app.innerHTML = homeView(all); setTitle("Гонки"); }
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
  app.innerHTML = `<div class="wrap state-box"><p>Такой страницы нет.</p><a class="btn btn-ghost" href="#/">К гонкам</a></div>`;
}

app.addEventListener("click", (e) => {
  if (e.target.closest("[data-retry]")) { route(); return; }
  const pin = e.target.closest("[data-pin]");
  if (pin) { me.set(pin.dataset.pin, pin.dataset.name); if (location.hash === "#/me") route(); else location.hash = "#/me"; return; }
  if (e.target.closest("[data-unpin]")) { me.set(null); route(); return; }
  const th = e.target.closest("[data-theme-set]");
  if (th) { theme.set(th.dataset.themeSet); route(); return; }
  const j = e.target.closest("[data-jump]");
  if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
});
window.addEventListener("hashchange", route);
route();
