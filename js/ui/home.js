// Раздел «Гонки»: первый экран лиги. Поиск себя, последняя гонка, лидеры сезона, все гонки по годам.
import { esc, dateRu, plural, STATE } from "./format.js?v=e7a2151d";
import { plate, pilotHref, ICON } from "./parts.js?v=e7a2151d";
import { racesByYear } from "../domain/season.js?v=e7a2151d";
import { pilotKey } from "../domain/parse.js?v=e7a2151d";
import { everyone } from "./pilots.js?v=e7a2151d";
import { LEAGUE } from "../races.js?v=e7a2151d";

const HITS = 8;
const pts = (n) => `${n} ${plural(n, "очко", "очка", "очков")}`;

/** Строка пилота в поиске и в полосе «Мой профиль». */
const hit = (p) => `<li><a href="${pilotHref(p.name)}"><span class="dot p-${esc(p.cls.id)}"></span>`
  + `<span class="pl-who"><b>${esc(p.name)}</b><small>${esc([p.village, p.cls.name].filter(Boolean).join(" · "))}</small></span>`
  + `<span class="pts">${p.points}</span></a></li>`;

/** Шапка лиги: имя, поиск себя по всей лиге, цифры сезона. Закреплённый пилот видит свою полосу. */
function hero(races, list, mine) {
  const ok = races.filter((d) => !d.error && d.season === LEAGUE.season);
  const fin = ok.reduce((n, d) => n + d.classes.reduce((k, c) => k + c.fin.length, 0), 0);
  const my = mine && list.find((p) => p.key === mine);
  return `<header class="hero hero-home"><div class="wrap">`
    + `<p class="eyebrow">Сезон ${LEAGUE.season}</p>`
    + `<h1>XASI <span class="q">ENDURO</span></h1>`
    + `<p class="lede">Любительские гонки эндуро. Найди себя: место, время, очки.</p>`
    + (my ? `<a class="me-strip p-${esc(my.cls.id)}" href="#/me"><span class="me-k">Мой профиль</span><b>${esc(my.name)}</b>`
      + `<span class="me-v">${esc(my.cls.name)}: ${my.rank} место, ${pts(my.points)}</span></a>` : "")
    + `<div class="search"><label for="hq">${my ? "Найти другого пилота" : "Найди себя"}</label><div class="search-box">${ICON.search}`
    + `<input id="hq" type="search" placeholder="Фамилия, имя или село" autocomplete="off" enterkeyhint="search"></div></div>`
    + `<ul class="plist home-hits" id="hits" hidden></ul><p class="note" id="hnone" aria-live="polite" hidden></p>`
    + `<dl class="facts"><div><dt>${plural(ok.length, "гонка", "гонки", "гонок")}</dt><dd><span data-roll>${ok.length}</span></dd></div>`
    + `<div><dt>${plural(list.length, "пилот", "пилота", "пилотов")}</dt><dd><span data-roll>${list.length}</span></dd></div>`
    + `<div><dt>${plural(fin, "финиш", "финиша", "финишей")}</dt><dd><span data-roll>${fin}</span></dd></div></dl>`
    + `</div></header>`;
}

/** Последняя гонка крупно: фото, состояние, победитель каждого класса. */
function feature(d) {
  const st = STATE[d.state];
  const win = d.classes.map((c) => c.fin[0] ? `<li>${plate(c.fin[0].n, c.id)}<span>${esc(c.fin[0].name)}</span><small>${esc(c.name)}</small></li>` : "").join("");
  return `<a class="last" href="#/g/${d.id}"${d.sponsor ? ` data-sponsor="${esc(d.sponsor.id)}"` : ""}>`
    + (d.photo ? `<img class="last-photo" src="${esc(d.photo.src)}" alt="${esc(d.photo.alt)}" width="480" height="848">` : "")
    + `<span class="last-body"><span class="rc-top"><span class="state ${st.cls}">Последняя гонка · ${st.label}</span>`
    + `${d.sponsor?.logo ? `<img src="${esc(d.sponsor.logo)}" alt="" width="44" height="44">` : ""}</span>`
    + `<b class="rc-name">${esc(d.name)}</b><span class="rc-meta">${esc(dateRu(d.date))} · ${esc(d.place)}</span>`
    + (d.sponsor ? `<span class="rc-meta">${esc(d.sponsor.role)}: ${esc(d.sponsor.brand || d.sponsor.name)}</span>` : "")
    + (win ? `<ul class="rc-win">${win}</ul>` : `<span class="rc-meta">Итоги появятся, когда организатор внесёт данные.</span>`)
    + `<span class="btn btn-fire last-go">${d.state === "soon" ? "Открыть гонку" : "Смотреть итоги"}</span></span></a>`;
}

/** Лидеры сезона: три первых пилота каждого класса. */
function leaders(season) {
  const cols = season.filter((c) => c.pilots.length).map((c) => `<div class="lead-col"><h3><span class="dot p-${esc(c.id)}"></span>${esc(c.name)}</h3>`
    + `<ol class="lead">` + c.pilots.slice(0, 3).map((p) => `<li><span class="r-place m${Math.min(p.rank, 4)}">${p.rank}</span>`
      + `<a class="r-name" href="${pilotHref(p.name)}">${esc(p.name)}</a><b class="pts">${p.points}</b></li>`).join("") + `</ol>`
    + `<a class="link-btn" href="#/s/${LEAGUE.season}/${esc(c.id)}">Вся таблица: ${esc(c.name)}</a></div>`).join("");
  return cols ? `<section class="band band-alt"><div class="wrap"><h2>Лидеры сезона</h2><div class="lead-grid">${cols}</div></div></section>` : "";
}

/** Строка гонки в списке года. */
function raceRow(d) {
  const st = d.error ? { cls: "st-soon", label: "Нет связи" } : STATE[d.state];
  return `<a class="race-row" href="#/g/${d.id}"><span class="rr-who"><b>${esc(d.name)}</b>`
    + `<small>${esc(dateRu(d.date))}${d.place ? " · " + esc(d.place) : ""}</small></span><span class="state ${st.cls}">${st.label}</span></a>`;
}

export function homeView(races, season = [], mine = null) {
  const years = racesByYear(races);
  const last = years[0]?.races.find((d) => !d.error);
  return hero(races, everyone(season), mine)
    + (last ? `<section class="band band-tight"><div class="wrap">${feature(last)}</div></section>` : "")
    + leaders(season)
    + `<section class="band"><div class="wrap"><h2>Все гонки</h2><div class="years">`
    + years.map(({ year, races: list }, i) => `<details class="year"${i === 0 ? " open" : ""}>`
      + `<summary><span class="year-n">${year}</span><span class="grp-n">${list.length} ${plural(list.length, "гонка", "гонки", "гонок")}</span></summary>`
      + `<div class="race-rows">${list.map(raceRow).join("")}</div></details>`).join("")
    + `</div></div></section>`;
}

/** Поиск по всей лиге прямо на первом экране: до 8 пилотов, остальное подскажет счётчик. */
export function bindHome(root, season) {
  const q = root.querySelector("#hq");
  if (!q) return;
  const list = everyone(season).map((p) => ({ p, hay: pilotKey([p.name, p.village, p.team].join(" ")) }));
  const hits = root.querySelector("#hits"), none = root.querySelector("#hnone");
  q.addEventListener("input", () => {
    const words = q.value.trim().split(/\s+/).filter(Boolean).map(pilotKey);
    const found = words.length ? list.filter(({ hay }) => words.every((w) => hay.includes(w))) : [];
    hits.hidden = !found.length;
    hits.innerHTML = found.slice(0, HITS).map(({ p }) => hit(p)).join("");
    none.hidden = !words.length || (found.length > 0 && found.length <= HITS);
    none.textContent = found.length ? `Показаны ${HITS} из ${found.length}. Допиши фамилию или село.` : "Никого не нашли. Проверь фамилию или село.";
  });
}
