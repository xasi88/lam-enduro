// Общие куски экранов: номер, строка протокола, пьедестал, вкладки классов.
import { esc, dur, clock, penText, plural, STATUS } from "./format.js?v=e7a2151d";
import { pilotKey } from "../domain/parse.js?v=e7a2151d";

export const ICON = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4h12l-2 4 2 4H5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20V10M12 20V4M18 20v-7"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
};

export const plate = (n, cls) => `<span class="plate p-${esc(cls)}" title="Стартовый номер">${n == null ? "?" : esc(n)}</span>`;
export const pilotHref = (name) => `#/p/${encodeURIComponent(pilotKey(name))}`;

/** Имя и одна тихая строка: село, команда, класс. Штраф виден сразу. */
export function who(r, label = "") {
  const sub = [r.from, r.team && "Команда " + r.team, label].filter(Boolean).join(" · ");
  return `<div class="r-who">${r.name ? `<a class="r-name" href="${pilotHref(r.name)}">${esc(r.name)}</a>` : "<b>Имя не указано</b>"}`
    + (sub ? `<span class="r-from">${esc(sub)}</span>` : "")
    + (r.pen ? `<span class="tag tag-warn">Штраф ${esc(penText(r.pen))}</span>` : "") + `</div>`;
}

const fact = (k, v) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;

/**
 * Строка протокола как на табло: место, номер, имя, время и отставание в одну строку.
 * Нажатие на время открывает подробности: старт, финиш, очки, штраф, прозвище.
 * clsId нужен для цвета номера, label добавляет класс в подпись (поиск по всем классам).
 */
export function row(r, clsId, label = "") {
  const fin = r.status === "fin";
  const more = [
    r.start != null ? fact("Старт", clock(r.start)) : fact("Старт", "не отмечен"),
    fin ? fact("Финиш", clock(r.finish)) : "",
    fin ? fact("Очки", `${r.points} ${plural(r.points, "очко", "очка", "очков")}`) : "",
    r.pen ? fact("Штраф", penText(r.pen)) : "",
    r.tag ? fact("Прозвище", `«${r.tag}»`) : "",
  ].join("");
  const side = fin
    ? `<b>${dur(r.time)}</b><span class="r-gap">${r.gap ? "+" + dur(r.gap) : "лучшее время"}</span>`
    : `<span class="r-status s-${r.status}">${STATUS[r.status].short}</span><span class="r-gap">подробно</span>`;
  return `<li class="row">${fin ? `<span class="r-place m${Math.min(r.place, 4)}">${r.place}</span>` : `<span class="r-place" aria-hidden="true"></span>`}`
    + `${plate(r.n, clsId)}${who(r, label)}`
    + `<button class="r-time" type="button" data-more aria-expanded="false" aria-label="Подробно: ${esc(r.name || "пилот")}">${side}</button>`
    + `<dl class="r-more" hidden>${more}</dl></li>`;
}

export function podium(c) {
  const top = c.fin.slice(0, 3);
  if (!top.length) return "";
  return `<div class="podium" aria-label="Три лучших времени">` + top.map((r, i) =>
    `<div class="pod pod-${i + 1}"><div class="pod-who">${plate(r.n, c.id)}<a class="r-name" href="${pilotHref(r.name)}">${esc(r.name)}</a>`
    + (r.from ? `<small>${esc(r.from)}</small>` : "") + `<span class="pod-time">${dur(r.time)}</span></div>`
    + `<div class="pod-step">${r.place}</div></div>`).join("") + `</div><div class="podium-base"></div>`;
}

/** Вкладки классов. href(c) даёт ссылку, count(c) подпись. */
export function classTabs(classes, current, href, count) {
  return `<nav class="classes" aria-label="Класс">` + classes.map((c) =>
    `<a class="cls p-${c.id}" href="${href(c)}"${c.id === current ? ' aria-current="page"' : ""}>`
    + `<span class="cls-name">${esc(c.name)}</span><span class="cls-count">${esc(count(c))}</span></a>`).join("") + `</nav>`;
}

/** Группы без места: сход, неявка и другие. */
export function others(c) {
  return `<div class="others">` + ["track", "dnf", "dsq", "dns", "nodata"].map((st) => {
    const rs = c.rest.filter((r) => r.status === st);
    return rs.length ? `<details class="grp"${st === "track" ? " open" : ""}><summary><span>${STATUS[st].title}</span><span class="grp-n">${rs.length}</span></summary>`
      + `<p class="grp-note">${STATUS[st].text}</p><ol class="proto">${rs.map((r) => row(r, c.id)).join("")}</ol></details>` : "";
  }).join("") + `</div>`;
}

export const loading = (text = "Загружаем таблицу организатора") =>
  `<div class="wrap state-box" role="status"><p>${esc(text)}…</p></div>`;

export const failed = () =>
  `<div class="wrap state-box"><p>Таблица не открылась. Проверь интернет и попробуй ещё раз.</p>`
  + `<button class="btn btn-fire" type="button" data-retry>Попробовать снова</button></div>`;
