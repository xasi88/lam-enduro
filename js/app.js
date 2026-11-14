// Переходы между экранами по адресу после «#». Нижний бар: Гонки, Сезон, Профиль.
// #/                    гонки по годам     #/g/<гонка>/<класс>  гонка
// #/s/<год>/<класс>     сезон              #/me                 мой профиль или выбор себя
// #/p                   все пилоты         #/p/<ключ>           пилот
// #/vs/<ключ>           выбор соперника    #/vs/<ключ>/<ключ2>  сравнение двух пилотов
// #/settings            настройки          #/new                что нового
// #/rules               регламент
import { RACES, LEAGUE, classK } from "./races.js?v=e7a2151d";
import { loadAll, loadRace, onFresh } from "./data.js?v=e7a2151d";
import { seasonTable, seasonsOf, leagueTable, pilotHistory } from "./domain/season.js?v=e7a2151d";
import { homeView, bindHome } from "./ui/home.js?v=e7a2151d";
import { openCard } from "./ui/card.js?v=e7a2151d";
import { raceView, bindRace } from "./ui/race.js?v=e7a2151d";
import { seasonView } from "./ui/season.js?v=e7a2151d";
import { pilotsView, bindPilots, pilotView } from "./ui/pilots.js?v=e7a2151d";
import { settingsView, newsView, bindSettings } from "./ui/settings.js?v=e7a2151d";
import { pickView, compareView } from "./ui/skills.js?v=e7a2151d";
import { rulesView } from "./ui/rules.js?v=e7a2151d";
import { loading, failed } from "./ui/parts.js?v=e7a2151d";
import { me, theme } from "./store.js?v=e7a2151d";
import { install } from "./install.js?v=e7a2151d";
import { watchMotion } from "./ui/motion.js?v=e7a2151d";
import { initFeedback } from "./ui/feedback.js?v=e7a2151d";

const app = document.getElementById("app");
const html = document.documentElement;
let timer = null, ticket = 0, loaded = [];

const seasonRaces = (all, year = LEAGUE.season) => all.filter((d) => !d.error && d.season === year);

function setNav(tab) {
  document.querySelectorAll("[data-tab]").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function setTitle(t) { document.title = t ? `${t} · ${LEAGUE.name}` : LEAGUE.name; }

// soft: тихое обновление того же экрана (пришли свежие данные): без «Загружаем», место и поиск на месте.
async function route(e, soft = false) {
  const my = ++ticket;
  clearInterval(timer); timer = null;
  const [, kind = "", a = "", b = ""] = location.hash.split("/").map(decodeURIComponent);
  const keepY = window.scrollY, keepQ = app.querySelector("#q")?.value;
  html.removeAttribute("data-sponsor");
  if (!soft) window.scrollTo(0, 0);
  try {
    if (kind === "g") {
      setNav("races");
      const race = RACES.find((r) => r.id === a);
      if (!race) return notFound();
      if (race.sponsor) html.setAttribute("data-sponsor", race.sponsor.id);
      if (!soft) app.innerHTML = loading();
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
      if (soft) restore(my, keepY, keepQ);
      return;
    }
    if (kind === "settings") {
      setNav("settings");
      app.innerHTML = settingsView(theme.get(), me.get() && me.name());
      bindSettings(app);
      setTitle("Настройки");
      return;
    }
    if (kind === "rules") {
      setNav("settings");
      app.innerHTML = rulesView();
      setTitle("Регламент");
      return;
    }
    if (kind === "new") {
      setNav("");
      app.innerHTML = newsView();
      setTitle("Что нового");
      return;
    }
    if (kind === "s" || kind === "p" || kind === "me" || kind === "vs" || kind === "") {
      setNav(kind === "s" ? "season" : kind === "" ? "races" : "me");
      if (!soft) app.innerHTML = loading();
      const all = await loadAll(RACES);
      if (my !== ticket) return;
      if (all.every((d) => d.error)) throw new Error("Нет данных");
      loaded = all.filter((d) => !d.error);
      if (kind === "s") {
        const years = seasonsOf(RACES, LEAGUE.season);
        const isYear = /^\d{4}$/.test(a);
        const year = isYear && years.includes(Number(a)) ? Number(a) : (years.includes(LEAGUE.season) ? LEAGUE.season : years[0]);
        const list = seasonRaces(all, year);
        app.innerHTML = seasonView({ season: seasonTable(list), league: leagueTable(list, classK), clsId: isYear ? b : a, year, years, raceCount: list.length });
        setTitle(`Сезон ${year}`);
        if (soft) restore(my, keepY, keepQ);
        return;
      }
      const season = seasonTable(seasonRaces(all));
      if (kind === "vs") {
        const ok = all.filter((d) => !d.error);
        if (!a) return notFound();
        if (b) { app.innerHTML = compareView(ok, season, a, b); setTitle("Сравнение"); }
        else { app.innerHTML = pickView(ok, a); bindPilots(app); setTitle("С кем сравнить"); }
        if (soft) restore(my, keepY, keepQ);
        return;
      }
      const mine = me.get();
      const key = kind === "me" ? mine : a;
      if (key && (kind === "me" || kind === "p")) { app.innerHTML = pilotView(all.filter((d) => !d.error), season, key, key === mine); setTitle(key === mine ? "Мой профиль" : "Пилот"); }
      else if (kind === "p" || kind === "me") { app.innerHTML = pilotsView(season); bindPilots(app); setTitle("Профиль"); }
      else { app.innerHTML = homeView(all, season, mine); bindHome(app, season); setTitle("Гонки"); }
      if (soft) restore(my, keepY, keepQ);
      return;
    }
    notFound();
  } catch (err) {
    if (my !== ticket) return;
    console.warn(err);
    app.innerHTML = failed();
  }
}

function restore(my, y, q) {
  if (my !== ticket) return;
  window.scrollTo(0, y);
  const i = q && app.querySelector("#q");
  if (i) { i.value = q; i.dispatchEvent(new Event("input")); }
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
  const more = e.target.closest("[data-more]");
  if (more) {
    const open = more.getAttribute("aria-expanded") !== "true";
    more.setAttribute("aria-expanded", String(open));
    more.closest(".row").querySelector(".r-more").hidden = !open;
    return;
  }
  const card = e.target.closest("[data-card]");
  if (card) {
    const rows = pilotHistory(loaded, card.dataset.card).sort((a, b) => b.race.date.localeCompare(a.race.date));
    const pick = rows.find((x) => x.rider.place) || rows[0];
    if (pick) openCard(pick, card);
    return;
  }
  const j = e.target.closest("[data-jump]");
  if (j) { e.preventDefault(); document.getElementById(j.dataset.jump)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
});
window.addEventListener("hashchange", route);
onFresh(() => { if (!document.querySelector(".fb-sheet")) route(null, true); });
watchMotion(app);
install.onChange(() => { if (location.hash === "#/settings") route(); });
initFeedback();
route();
