// Раздел «Профиль»: пилот находит себя и закрепляет. Страница одного пилота.
import { esc, dur, dateRu, plural, STATUS } from "./format.js?v=e7a2151d";
import { plate, pilotHref, ICON } from "./parts.js?v=e7a2151d";
import { pilotKey } from "../domain/parse.js?v=e7a2151d";
import { pilotHistory, pilotStats } from "../domain/season.js?v=e7a2151d";
import { LEAGUE } from "../races.js?v=e7a2151d";
import { skillsBlock } from "./skills.js?v=e7a2151d";

/** Все пилоты сезона: у каждого класс, где больше очков. Экран делит их на группы по классам. */
export function everyone(season) {
  const m = new Map();
  for (const c of season) for (const p of c.pilots) {
    const cur = m.get(p.key);
    if (!cur || p.points > cur.points) m.set(p.key, { ...p, cls: c });
  }
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function pilotsView(season) {
  const list = everyone(season);
  return `<header class="page-head"><div class="wrap"><h1>Профиль</h1><p class="lede">Найди себя в списке и открой свою страницу. Там нажми «Это я»: профиль закрепится на этом телефоне.</p>`
    + `<div class="search"><label for="pq">Поиск среди ${list.length} ${plural(list.length, "пилота", "пилотов", "пилотов")}</label><div class="search-box">${ICON.search}`
    + `<input id="pq" type="search" placeholder="Фамилия, имя или село" autocomplete="off" enterkeyhint="search"></div></div></div></header>`
    + `<section class="band band-tight"><div class="wrap" id="plist">`
    + season.map((c) => {
      const ps = list.filter((p) => p.cls.id === c.id);
      return ps.length ? `<div class="pgroup"><h2 class="pgroup-h"><span class="dot p-${c.id}"></span>${esc(c.name)}<span class="grp-n">${ps.length}</span></h2><ul class="plist">`
        + ps.map((p) => `<li data-hay="${esc(pilotKey([p.name, p.village, p.team].join(" ")))}"><a href="${pilotHref(p.name)}">`
          + `<span class="dot p-${c.id}"></span><span class="pl-who"><b>${esc(p.name)}</b><small>${esc(p.village || "Село не указано")}</small></span>`
          + `<span class="pts">${p.points}</span></a></li>`).join("") + `</ul></div>` : "";
    }).join("")
    + `<p class="note" id="pnone" hidden>Никого не нашли. Проверь фамилию или село.</p></div></section>`;
}

export function bindPilots(root) {
  const q = root.querySelector("#pq");
  if (!q) return;
  const items = [...root.querySelectorAll("#plist li")];
  q.addEventListener("input", () => {
    const words = q.value.trim().split(/\s+/).filter(Boolean).map(pilotKey);
    let shown = 0;
    items.forEach((li) => { const ok = words.every((w) => li.dataset.hay.includes(w)); li.hidden = !ok; shown += ok; });
    root.querySelectorAll(".pgroup").forEach((g) => { g.hidden = !g.querySelector("li:not([hidden])"); });
    root.querySelector("#pnone").hidden = shown > 0;
  });
}

/** Три карточки цифр пилота со столбиками по гонкам (образец Stat card). */
function statCards(rows) {
  const s = pilotStats(rows);
  const bars = (h) => `<span class="stat-bars" aria-hidden="true">` + s.series.map((x, i) => {
    const v = h(x);
    return `<i class="${v ? "" : "off"}" style="--i:${i};height:${Math.max(10, Math.round(v * 100))}%"></i>`;
  }).join("") + `</span>`;
  const card = (k, v, sub, h) => `<div class="stat"><span class="stat-k">${k}</span>${v}<small>${sub}</small>${bars(h)}</div>`;
  return `<div class="p-stats">`
    + card("Гонок", `<b class="stat-v"><span data-roll>${s.starts}</span></b>`, `${s.finishes} ${plural(s.finishes, "финиш", "финиша", "финишей")}`, (x) => (x.place ? 1 : 0))
    + card("Лучшее место", s.best ? `<b class="stat-v"><span data-roll>${s.best}</span></b>` : `<b class="stat-v none">Нет финиша</b>`, "по гонкам", (x) => (x.place ? (21 - Math.min(x.place, 20)) / 20 : 0))
    + card("Очки", `<b class="stat-v"><span data-roll>${s.points}</span></b>`, "за все гонки", (x) => x.points / 25)
    + `</div>`;
}

export function pilotView(races, season, key, mine) {
  const rows = pilotHistory(races, key).sort((a, b) => b.race.date.localeCompare(a.race.date));
  if (!rows.length) return `<div class="wrap state-box"><p>Такого пилота нет в таблицах.</p><a class="btn btn-ghost" href="#/me">Выбрать себя</a>${mine ? `<button class="btn btn-ghost" type="button" data-unpin>Открепить профиль</button>` : ""}</div>`;
  const r0 = rows[0].rider;
  const village = rows.map((x) => x.rider.village).find(Boolean);
  const team = rows.map((x) => x.rider.team).find(Boolean);
  const stands = season.map((c) => ({ c, p: c.pilots.find((p) => p.key === key) })).filter((x) => x.p);
  const text = `${r0.name} в сезоне ${LEAGUE.season} лиги «${LEAGUE.name}»: ${stands.map((s) => `${s.c.name}, ${s.p.rank} место, ${s.p.points} ${plural(s.p.points, "очко", "очка", "очков")}`).join("; ")}.`;
  const share = `https://wa.me/?text=${encodeURIComponent(text + " " + location.href.split("#")[0] + "#/p/" + encodeURIComponent(key))}`;
  return `<header class="page-head"><div class="wrap">${mine ? `<p class="eyebrow">Мой профиль</p>` : `<a class="back" href="#/p">${ICON.back}Все пилоты</a>`}`
    + `<h1>${esc(r0.name)}</h1><p class="lede">${esc([village, team && "Команда " + team].filter(Boolean).join(" · ") || "Село не указано")}</p>`
    + `<div class="p-stand">` + stands.map(({ c, p }) => `<a class="p-card p-${c.id}" href="#/s/${LEAGUE.season}/${c.id}"><span class="dot p-${c.id}"></span><span>${esc(c.name)}</span>`
      + `<b>${p.rank} место</b><small>${p.points} ${plural(p.points, "очко", "очка", "очков")} · ${p.starts} ${plural(p.starts, "старт", "старта", "стартов")}</small></a>`).join("") + `</div>`
    + statCards(rows)
    + `<div class="cta">${mine ? "" : `<button class="btn btn-fire" type="button" data-pin="${esc(key)}" data-name="${esc(r0.name)}">${ICON.user}Это я</button>`}`
    + `<a class="btn ${mine ? "btn-fire" : "btn-ghost"}" href="${share}" target="_blank" rel="noopener">${ICON.share}Поделиться в WhatsApp</a>`
    + `<button class="btn btn-ghost" type="button" data-card="${esc(key)}">${ICON.image}Картинка результата</button>`
    + `${mine ? `<button class="btn btn-ghost" type="button" data-unpin>Сменить пилота</button>` : ""}</div></div></header>`
    + skillsBlock(races, key)
    + `<section class="band"><div class="wrap"><h2>Гонки</h2><ol class="proto hist">`
    + rows.map(({ race, cls, rider: r }) => `<li class="row"><span class="r-place m${r.place ? Math.min(r.place, 4) : 4}">${r.place ?? ""}</span>${plate(r.n, cls.id)}`
      + `<div class="r-who"><a class="r-name" href="#/g/${race.id}/${cls.id}">${esc(race.name)}</a><span class="r-from">${esc(dateRu(race.date))} · ${esc(cls.name)}</span></div>`
      + `<div class="r-time">${r.place ? `<b>${dur(r.time)}</b><span class="r-pts">${r.points} ${plural(r.points, "очко", "очка", "очков")}</span>` : `<span class="r-status s-${r.status}">${STATUS[r.status].short}</span>`}</div></li>`).join("")
    + `</ol></div></section>`;
}
