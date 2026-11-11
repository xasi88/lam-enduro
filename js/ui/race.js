// Страница гонки: шапка, итоги по классам, поиск внутри гонки. Остальные разделы: race-more.js
import { esc, dur, plural, dateRu, timeNow, STATE } from "./format.js?v=9215d078";
import { plate, row, podium, classTabs, others, ICON } from "./parts.js?v=9215d078";
import { moreSections, villagesOf } from "./race-more.js?v=9215d078";
import { pilotKey } from "../domain/parse.js?v=9215d078";

const norm = (s) => pilotKey(s);

function hero(d) {
  const all = d.classes.flatMap((c) => c.riders.filter((r) => r.name));
  const fin = d.classes.reduce((n, c) => n + c.fin.length, 0);
  const st = STATE[d.state];
  const sp = d.sponsor;
  return `<header class="hero"><div class="wrap hero-grid"><div>`
    + `<p class="eyebrow">${esc(dateRu(d.date))} · ${esc(d.place)}</p>`
    + `<h1>${esc(d.title || d.name)}</h1>`
    + `<p class="sub"><span class="state ${st.cls}">${st.label}</span>${sp ? `${sp.logo ? `<img class="sub-logo" src="${esc(sp.logo)}" alt="" width="44" height="44">` : ""}<span class="muted sub-sp">${esc(sp.brand)}</span>` : ""}</p>`
    + (d.about ? `<p class="lede">${esc(d.about)}</p>` : "")
    + `<dl class="facts"><div><dt>в списках</dt><dd>${all.length}</dd></div><div><dt>на финише</dt><dd>${fin}</dd></div>`
    + `<div><dt>${plural(d.classes.length, "класс", "класса", "классов")}</dt><dd>${d.classes.length}</dd></div>`
    + `<div><dt>сёл и городов</dt><dd>${villagesOf(d).size}</dd></div></dl>`
    + `<div class="cta"><a class="btn btn-fire" href="#itogi" data-jump="itogi">Смотреть итоги</a><a class="btn btn-ghost" href="#poisk" data-jump="poisk">Найти себя</a></div>`
    + `</div>` + (d.photo ? `<figure class="hero-photo"><img src="${esc(d.photo.src)}" alt="${esc(d.photo.alt)}" width="480" height="848"><figcaption>${esc(d.photo.caption)}</figcaption></figure>` : "")
    + `</div></header>`;
}

function note(d) {
  const at = d.loadedAt ? timeNow(d.loadedAt) : "";
  if (d.stale) return `Нет связи с таблицей. Показаны данные на ${at}.`;
  if (d.state === "soon") return "Гонка ещё не началась. Когда организатор внесёт старты, итоги появятся здесь сами.";
  if (d.state === "live") return `Гонка идёт. Страница сама обновляется раз в минуту, последнее обновление в ${at}.`;
  return "Место по итоговому времени: финиш минус старт плюс штраф. Равное время: одно место на двоих.";
}

function results(d, clsId) {
  const c = d.classes.find((x) => x.id === clsId) || d.classes[0];
  if (!c) return "";
  const named = c.riders.filter((r) => r.name).length;
  return `<section class="band" id="itogi"><div class="wrap">`
    + `<div class="sec-head"><h2>Итоги</h2></div><p class="note">${esc(note(d))}</p>`
    + `<div class="search" id="poisk"><label for="q">Найти пилота в этой гонке</label><div class="search-box">${ICON.search}`
    + `<input id="q" type="search" placeholder="Фамилия, село или номер" autocomplete="off" enterkeyhint="search"></div></div>`
    + `<div id="view">` + classTabs(d.classes, c.id, (x) => `#/g/${d.id}/${x.id}`, (x) => `${x.fin.length} из ${x.riders.filter((r) => r.name).length} на финише`)
    + podium(c)
    + `<h3 class="proto-title">Протокол: ${esc(c.name)}</h3>`
    + (c.fin.length ? `<ol class="proto">${c.fin.map((r) => row(r, c.id)).join("")}</ol>` : `<p class="note">${named ? "Финишей пока нет." : "Пилотов в этом классе пока нет."}</p>`)
    + others(c) + `</div>`
    + `<div id="found" hidden><div class="found-head"><p id="found-n" aria-live="polite"></p>`
    + `<button type="button" class="link-btn" id="found-reset">Сбросить поиск</button></div><ol class="proto" id="found-list"></ol></div>`
    + `</div></section>`;
}

export function raceView(d, clsId) {
  return hero(d) + results(d, clsId) + moreSections(d)
    + `<p class="wrap upd">Данные: таблица организатора, загружено в ${esc(timeNow(d.loadedAt))}. Нашёл ошибку в имени или времени? Скажи организатору гонки.</p>`;
}

/** Поиск внутри гонки по всем классам. */
export function bindRace(root, d) {
  const q = root.querySelector("#q");
  if (!q) return;
  const all = d.classes.flatMap((c) => c.riders.map((r) => ({ r, c, hay: norm([r.name, r.from, r.village, r.team, r.tag].join(" ")) })));
  const view = root.querySelector("#view"), found = root.querySelector("#found");
  const run = () => {
    const words = q.value.trim().split(/\s+/).filter(Boolean);
    view.hidden = words.length > 0; found.hidden = !words.length;
    if (!words.length) return;
    const hits = all.filter(({ r, hay }) => words.every((w) => (/^\d+$/.test(w) ? r.n === Number(w) : hay.includes(norm(w)))));
    hits.sort((a, b) => d.classes.indexOf(a.c) - d.classes.indexOf(b.c) || (a.r.place ?? 1e9) - (b.r.place ?? 1e9));
    root.querySelector("#found-n").textContent = hits.length ? `Найдено: ${hits.length}` : "Никого не нашли. Проверь фамилию, село или номер.";
    root.querySelector("#found-list").innerHTML = hits.map(({ r, c }) => row(r, c.id, c.name)).join("");
  };
  q.addEventListener("input", run);
  root.querySelector("#found-reset").addEventListener("click", () => { q.value = ""; run(); q.focus(); });
}

export { plate, dur };
