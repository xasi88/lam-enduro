// Раздел «Гонки»: все гонки по годам. Последний год открыт, последняя гонка первая и крупнее.
import { esc, dateRu, plural, STATE } from "./format.js?v=7cf5ea81";
import { plate } from "./parts.js?v=7cf5ea81";
import { racesByYear } from "../domain/season.js?v=7cf5ea81";

function raceCard(d, big) {
  const href = `#/g/${d.id}`;
  const cls = `race-card${big ? " race-card-last" : ""}`;
  if (d.error) {
    return `<a class="${cls}" href="${href}"><span class="rc-top"><span class="state st-soon">Нет связи</span></span>`
      + `<b class="rc-name">${esc(d.name)}</b><span class="rc-meta">${esc(dateRu(d.date))}</span></a>`;
  }
  const st = STATE[d.state];
  const win = d.classes.map((c) => c.fin[0] ? `<li>${plate(c.fin[0].n, c.id)}<span>${esc(c.fin[0].name)}</span><small>${esc(c.name)}</small></li>` : "").join("");
  return `<a class="${cls}" href="${href}"${d.sponsor ? ` data-sponsor="${esc(d.sponsor.id)}"` : ""}>`
    + `<span class="rc-top"><span class="state ${st.cls}">${big ? "Последняя гонка · " : ""}${st.label}</span>${d.sponsor?.logo ? `<img src="${esc(d.sponsor.logo)}" alt="" width="44" height="44">` : ""}</span>`
    + `<b class="rc-name">${esc(d.name)}</b><span class="rc-meta">${esc(dateRu(d.date))} · ${esc(d.place)}</span>`
    + (d.sponsor ? `<span class="rc-meta">${esc(d.sponsor.role)}: ${esc(d.sponsor.brand || d.sponsor.name)}</span>` : "")
    + (win ? `<ul class="rc-win">${win}</ul>` : `<span class="rc-meta">Итоги появятся, когда организатор внесёт данные.</span>`)
    + `<span class="rc-go">Открыть гонку</span></a>`;
}

export function homeView(races) {
  const years = racesByYear(races);
  return `<header class="page-head"><div class="wrap"><h1>Гонки</h1>`
    + `<p class="lede">Вся история лиги по годам. Нажми на гонку: итоги, протокол, спонсор.</p></div></header>`
    + `<section class="band band-tight"><div class="wrap years">`
    + years.map(({ year, races: list }, i) => `<details class="year"${i === 0 ? " open" : ""}>`
      + `<summary><span class="year-n">${year}</span><span class="grp-n">${list.length} ${plural(list.length, "гонка", "гонки", "гонок")}</span></summary>`
      + `<div class="race-list">${list.map((d, j) => raceCard(d, i === 0 && j === 0)).join("")}</div></details>`).join("")
    + `</div></section>`;
}
