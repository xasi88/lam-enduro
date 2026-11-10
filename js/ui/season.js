// Общая таблица сезона по классу.
import { esc, plural } from "./format.js?v=1466f04a";
import { classTabs, pilotHref } from "./parts.js?v=1466f04a";
import { POINTS } from "../domain/results.js?v=1466f04a";
import { LEAGUE } from "../races.js?v=1466f04a";

export function seasonView(season, clsId, raceCount) {
  const c = season.find((x) => x.id === clsId) || season[0];
  const head = `<header class="page-head"><div class="wrap"><h1>Сезон ${LEAGUE.season}</h1>`
    + `<p class="lede">После ${raceCount} ${plural(raceCount, "гонки", "гонок", "гонок")}. Очки за место в классе: ${POINTS.slice(0, 7).join(", ")} и дальше на 1 меньше до 1 очка за 20 место. Сход и неявка: 0.</p></div></header>`;
  if (!c) return head + `<p class="wrap note">Данных пока нет.</p>`;
  const max = c.pilots[0]?.points || 1;
  return head + `<section class="band"><div class="wrap">`
    + classTabs(season, c.id, (x) => `#/s/${x.id}`, (x) => `${x.pilots.length} ${plural(x.pilots.length, "пилот", "пилота", "пилотов")}`)
    + (c.pilots.length ? `<ol class="stand">` + c.pilots.map((p) =>
      `<li class="st-row"><span class="r-place m${Math.min(p.rank, 4)}">${p.rank}</span>`
      + `<div class="st-who"><a class="r-name" href="${pilotHref(p.name)}">${esc(p.name)}</a>`
      + `<small>${esc([p.village, p.team && "Команда " + p.team, `${p.starts} ${plural(p.starts, "старт", "старта", "стартов")}`].filter(Boolean).join(" · "))}</small></div>`
      + `<span class="st-bar"><i style="width:${Math.max(2, (p.points / max) * 100)}%"></i></span>`
      + `<b class="pts">${p.points}</b></li>`).join("") + `</ol>` : `<p class="note">В этом классе пока нет пилотов.</p>`)
    + `<p class="note">Равные очки: выше тот, у кого лучше места в гонках. Нашёл ошибку в имени? Скажи организатору.</p>`
    + `</div></section>`;
}
