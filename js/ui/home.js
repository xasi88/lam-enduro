// Главная: лига, список гонок, лидеры сезона.
import { esc, dateRu, plural, STATE } from "./format.js?v=1466f04a";
import { plate, pilotHref } from "./parts.js?v=1466f04a";
import { LEAGUE } from "../races.js?v=1466f04a";

function raceCard(d) {
  const href = `#/g/${d.id}`;
  if (d.error) {
    return `<a class="race-card" href="${href}"><span class="rc-top"><span class="state st-soon">Нет связи</span></span>`
      + `<b class="rc-name">${esc(d.name)}</b><span class="rc-meta">${esc(dateRu(d.date))}</span></a>`;
  }
  const st = STATE[d.state];
  const win = d.classes.map((c) => c.fin[0] ? `<li>${plate(c.fin[0].n, c.id)}<span>${esc(c.fin[0].name)}</span><small>${esc(c.name)}</small></li>` : "").join("");
  return `<a class="race-card" href="${href}"${d.sponsor ? ` data-sponsor="${esc(d.sponsor.id)}"` : ""}>`
    + `<span class="rc-top"><span class="state ${st.cls}">${st.label}</span>${d.sponsor?.logo ? `<img src="${esc(d.sponsor.logo)}" alt="" width="44" height="44">` : ""}</span>`
    + `<b class="rc-name">${esc(d.name)}</b><span class="rc-meta">${esc(dateRu(d.date))} · ${esc(d.place)}</span>`
    + (win ? `<ul class="rc-win">${win}</ul>` : `<span class="rc-meta">Итоги появятся, когда организатор внесёт данные.</span>`)
    + `<span class="rc-go">Открыть гонку</span></a>`;
}

function leaders(season) {
  if (!season.some((c) => c.pilots.length)) return "";
  return `<section class="band band-alt"><div class="wrap"><div class="sec-head"><h2>Сезон ${LEAGUE.season}</h2></div>`
    + `<p class="note">Лидеры общей таблицы. Очки за место в классе в каждой гонке.</p><div class="lead-grid">`
    + season.map((c) => `<div class="lead-col"><h3><span class="dot p-${c.id}"></span>${esc(c.name)}</h3><ol class="lead">`
      + c.pilots.slice(0, 3).map((p) => `<li><span class="r-place m${Math.min(p.rank, 4)}">${p.rank}</span>`
        + `<a class="r-name" href="${pilotHref(p.name)}">${esc(p.name)}</a><b class="pts">${p.points}</b></li>`).join("")
      + `</ol><a class="link-btn" href="#/s/${c.id}">Вся таблица: ${esc(c.name)}</a></div>`).join("")
    + `</div></div></section>`;
}

export function homeView(races, season) {
  const ok = races.filter((d) => !d.error);
  const names = new Set(), villages = new Set();
  ok.forEach((d) => d.classes.forEach((c) => c.riders.forEach((r) => { if (r.name) names.add(r.name.toLowerCase()); if (r.name && r.village) villages.add(r.village); })));
  const last = [...races].sort((a, b) => b.date.localeCompare(a.date))[0];
  return `<header class="hero hero-home"><div class="wrap"><p class="eyebrow">Любительские гонки эндуро · сезон ${LEAGUE.season}</p>`
    + `<h1>Лам <span class="q">Эндуро</span></h1>`
    + `<p class="lede">Горы, лес и реки Чечни. Итоги каждой гонки и общая таблица сезона: ищи себя, смотри свои места и очки.</p>`
    + `<dl class="facts"><div><dt>${plural(races.length, "гонка", "гонки", "гонок")}</dt><dd>${races.length}</dd></div>`
    + `<div><dt>пилотов</dt><dd>${names.size}</dd></div><div><dt>сёл и городов</dt><dd>${villages.size}</dd></div></dl>`
    + `<div class="cta">${last ? `<a class="btn btn-fire" href="#/g/${last.id}">Последняя гонка</a>` : ""}<a class="btn btn-ghost" href="#/s/gold">Сезон ${LEAGUE.season}</a></div>`
    + `</div></header>`
    + `<section class="band"><div class="wrap"><div class="sec-head"><h2>Гонки</h2></div><div class="race-list">`
    + [...races].sort((a, b) => b.date.localeCompare(a.date)).map(raceCard).join("") + `</div></div></section>`
    + leaders(season);
}
