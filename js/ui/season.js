// Раздел «Сезон»: выбор сезона, класс, подиум по очкам, таблица остальных.
import { esc, plural } from "./format.js?v=e5947e70";
import { classTabs, pilotHref } from "./parts.js?v=e5947e70";
import { POINTS } from "../domain/results.js?v=e5947e70";

function seasonPodium(top) {
  if (!top.length) return "";
  return `<div class="podium" aria-label="Три лучших по очкам">` + top.map((p, i) =>
    `<div class="pod pod-${i + 1}"><div class="pod-who">`
    + `<a class="r-name" href="${pilotHref(p.name)}">${esc(p.name)}</a>`
    + (p.village ? `<small>${esc(p.village)}</small>` : "") + `<span class="pod-time"><span data-roll>${p.points}</span> ${plural(p.points, "очко", "очка", "очков")}</span></div>`
    + `<div class="pod-step">${p.rank}</div></div>`).join("") + `</div><div class="podium-base"></div>`;
}

const row = (p, max) => `<li class="st-row"><span class="r-place m${Math.min(p.rank, 4)}">${p.rank}</span>`
  + `<div class="st-who"><a class="r-name" href="${pilotHref(p.name)}">${esc(p.name)}</a>`
  + `<small>${esc([p.village, p.team && "Команда " + p.team, `${p.starts} ${plural(p.starts, "старт", "старта", "стартов")}`].filter(Boolean).join(" · "))}</small></div>`
  + `<span class="st-bar"><i style="width:${Math.max(2, (p.points / max) * 100)}%"></i></span>`
  + `<b class="pts"><span data-roll>${p.points}</span></b></li>`;

export function seasonView({ season, clsId, year, years, raceCount }) {
  const c = season.find((x) => x.id === clsId) || season[0];
  const pick = `<nav class="seasons" aria-label="Сезон">` + years.map((y) =>
    `<a class="pill" href="#/s/${y}/${c ? c.id : ""}"${y === year ? ' aria-current="page"' : ""}>Сезон ${y}</a>`).join("") + `</nav>`;
  const head = `<header class="page-head"><div class="wrap">${pick}<h1>Сезон ${year}</h1>`
    + `<p class="lede">${raceCount ? `После ${raceCount} ${plural(raceCount, "гонки", "гонок", "гонок")}.` : "Гонок в этом сезоне пока нет."} Очки за место в классе: ${POINTS.slice(0, 7).join(", ")} и дальше на 1 меньше до 1 очка за 20 место. Сход и неявка: 0.</p></div></header>`;
  if (!c) return head + `<p class="wrap note">Данных пока нет.</p>`;
  const max = c.pilots[0]?.points || 1;
  const top = c.pilots.slice(0, 3), rest = c.pilots.slice(3);
  return head + `<section class="band band-tight"><div class="wrap">`
    + classTabs(season, c.id, (x) => `#/s/${year}/${x.id}`, (x) => `${x.pilots.length} ${plural(x.pilots.length, "пилот", "пилота", "пилотов")}`)
    + (c.pilots.length ? seasonPodium(top)
      + (rest.length ? `<h2 class="proto-title">Все участники</h2><ol class="stand">${rest.map((p) => row(p, max)).join("")}</ol>` : "")
      : `<p class="note">В этом классе пока нет пилотов.</p>`)
    + `<p class="note">Равные очки: выше тот, у кого лучше места в гонках. Нашёл ошибку в имени? Скажи организатору.</p>`
    + `</div></section>`;
}
