// Паутинка сторон пилота и экран сравнения двух пилотов. Расчёт: js/domain/skills.js
import { esc, dateRu, STATUS } from "./format.js?v=e5947e70";
import { ICON } from "./parts.js?v=e5947e70";
import { pilotKey } from "../domain/parse.js?v=e5947e70";
import { SIDES, classSkills, pilotSkills, headToHead, better } from "../domain/skills.js?v=e5947e70";
import { LEAGUE } from "../races.js?v=e5947e70";

const W = 340, H = 300, CX = 170, CY = 150, R = 84;
const pt = (i, f) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / SIDES.length;
  return [CX + Math.cos(a) * R * f, CY + Math.sin(a) * R * f];
};
const poly = (fs) => fs.map((f, i) => pt(i, f).map((n) => n.toFixed(1)).join(",")).join(" ");

/** Рисунок. sets: [{ sides, cls }], labels: показывать ли значения у вершин. */
export function radar(sets, labels = true) {
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="rd-ring" points="${poly(SIDES.map(() => f))}"/>`).join("");
  const axes = SIDES.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="rd-axis" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
  const shapes = sets.map(({ sides, cls }) => {
    const fs = sides.map((s) => (s.score == null ? 0 : Math.max(0.06, s.score / 100)));
    return `<polygon class="rd-shape ${cls}" points="${poly(fs)}"/>`
      + fs.map((f, i) => (sides[i].score == null ? "" : `<circle class="rd-dot ${cls}" cx="${pt(i, f)[0].toFixed(1)}" cy="${pt(i, f)[1].toFixed(1)}" r="4"/>`)).join("");
  }).join("");
  const text = SIDES.map((s, i) => {
    const [x, y] = pt(i, 1.24);
    const anchor = Math.abs(x - CX) < 8 ? "middle" : x > CX ? "start" : "end";
    const dy = y < CY - 20 ? -6 : y > CY + 20 ? 10 : 0;
    const val = labels ? sets[0].sides[i].text : "";
    return `<text class="rd-label" x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}">${esc(s.name)}</text>`
      + (val ? `<text class="rd-val" x="${x.toFixed(1)}" y="${(y + dy + 17).toFixed(1)}" text-anchor="${anchor}">${esc(val)}</text>` : "");
  }).join("");
  return `<svg class="radar" viewBox="-44 -6 ${W + 88} ${H + 24}" role="img" aria-label="Стороны пилота">${rings}${axes}${shapes}${text}</svg>`;
}

const seasonRaces = (races) => races.filter((r) => r.season === LEAGUE.season);
const placeText = (s) => `${s.place} из ${s.of} в классе`;

/** Блок «Сильные и слабые стороны» на странице пилота. */
export function skillsBlock(races, key) {
  const s = pilotSkills(seasonRaces(races), key);
  if (!s) return "";
  if (!s.shown) {
    return `<section class="band band-tight"><div class="wrap"><h2>Стороны пилота</h2>`
      + `<p class="note">Паутинка появится после финиша в гонке сезона.</p></div></section>`;
  }
  const list = [
    ...s.strong.map((x) => `<li class="sk-good"><b>${esc(x.name)}</b><span>${esc(x.text)} · ${esc(placeText(x))}</span></li>`),
    ...(s.weak ? [`<li class="sk-weak"><b>${esc(s.weak.name)}</b><span>${esc(s.weak.text)} · ${esc(placeText(s.weak))}</span></li>`] : []),
  ].join("");
  const left = s.sides.filter((x) => x.score == null).map((x) => x.name.toLowerCase());
  return `<section class="band band-tight"><div class="wrap sk">`
    + `<div class="sk-head"><h2>Сильные и слабые стороны</h2><span class="sk-badge">${esc(s.label)}</span></div>`
    + `<div class="sk-body"><div class="sk-fig">${radar([{ sides: s.sides, cls: "rd-a" }])}</div>`
    + `<div class="sk-side">${list ? `<ul class="sk-list">${list}</ul>` : ""}`
    + `<p class="note">Чем дальше точка от центра, тем выше пилот среди своего класса по этой стороне. Считаются гонки сезона ${LEAGUE.season}.`
    + (left.length ? ` Пока без оценки: ${esc(left.join(", "))}. Им нужно больше гонок.` : "") + `</p>`
    + `<a class="btn btn-ghost" href="#/vs/${encodeURIComponent(key)}">${ICON.chart}Сравнить с другим пилотом</a></div></div>`
    + `</div></section>`;
}

/** Все пилоты сезона для выбора соперника. */
/** Соперники по классам. Класс самого пилота первым: чаще сравнивают внутри класса. */
function pickGroups(races, except) {
  const m = new Map(), classes = new Map();
  let mine = null;
  for (const r of seasonRaces(races)) for (const c of r.classes) for (const x of c.riders) {
    if (!x.name || x.status === "nodata" || x.status === "dns") continue;
    if (!classes.has(c.id)) classes.set(c.id, c.name);
    const k = pilotKey(x.name);
    if (k === except) mine = c.id;
    else m.set(k, { key: k, name: x.name, village: x.village, cls: c.id });
  }
  const ids = [...classes.keys()].sort((a, b) => (b === mine) - (a === mine));
  const list = [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return ids.map((id) => ({ id, name: classes.get(id), pilots: list.filter((p) => p.cls === id) })).filter((g) => g.pilots.length);
}

/** Выбор второго пилота. */
export function pickView(races, a) {
  const me = pilotSkills(seasonRaces(races), a);
  const groups = pickGroups(races, a);
  return `<header class="page-head"><div class="wrap"><a class="back" href="#/p/${encodeURIComponent(a)}">${ICON.back}${esc(me?.name || "Пилот")}</a>`
    + `<h1>С кем сравнить?</h1><div class="search"><label for="pq">Поиск пилота</label><div class="search-box">${ICON.search}`
    + `<input id="pq" type="search" placeholder="Фамилия, имя или село" autocomplete="off" enterkeyhint="search"></div></div></div></header>`
    + `<section class="band band-tight"><div class="wrap" id="plist">`
    + groups.map((g) => `<div class="pgroup"><h2 class="pgroup-h"><span class="dot p-${g.id}"></span>${esc(g.name)}<span class="grp-n">${g.pilots.length}</span></h2><ul class="plist">`
      + g.pilots.map((p) => `<li data-hay="${esc(pilotKey([p.name, p.village].join(" ")))}"><a href="#/vs/${encodeURIComponent(a)}/${encodeURIComponent(p.key)}">`
        + `<span class="dot p-${p.cls}"></span><span class="pl-who"><b>${esc(p.name)}</b><small>${esc(p.village || "Село не указано")}</small></span></a></li>`).join("") + `</ul></div>`).join("")
    + `<p class="note" id="pnone" hidden>Никого не нашли. Проверь фамилию или село.</p></div></section>`;
}

/** Сравнение двух пилотов. */
export function compareView(races, season, a, b) {
  const list = seasonRaces(races);
  const all = classSkills(list);
  const A = pilotSkills(list, a, all), B = pilotSkills(list, b, all);
  if (!A || !B) return `<div class="wrap state-box"><p>Одного из пилотов нет в гонках сезона.</p><a class="btn btn-ghost" href="#/p">Все пилоты</a></div>`;
  const stand = (k, clsId) => season.find((c) => c.id === clsId)?.pilots.find((p) => p.key === k);
  const sa = stand(a, A.clsId), sb = stand(b, B.clsId);
  const clsName = (id) => season.find((c) => c.id === id)?.name || "";
  const h = headToHead(list, a, b);
  const head = (P, s, side) => `<div class="vs-who vs-${side}"><a class="r-name" href="#/p/${encodeURIComponent(P.key)}">${esc(P.name)}</a>`
    + `<small><span class="dot p-${P.clsId}"></span>${esc(clsName(P.clsId))}${s ? ` · ${s.rank} место` : ""}</small>`
    + `<a class="link-btn" href="#/vs/${encodeURIComponent(side === "a" ? b : a)}">Сменить</a></div>`;
  const line = (name, ta, tb, win) => `<li class="vs-row"><span class="vs-a${win === "a" ? " vs-win" : ""}">${esc(ta)}</span>`
    + `<span class="vs-name">${esc(name)}</span><span class="vs-b${win === "b" ? " vs-win" : ""}">${esc(tb)}</span></li>`;
  const num = (x, y) => (x == null || y == null || x === y ? null : x > y ? "a" : "b");
  const rows = [
    line("Очки сезона", String(sa?.points ?? 0), String(sb?.points ?? 0), num(sa?.points ?? 0, sb?.points ?? 0)),
    line("Финиши", `${A.fins} из ${A.starts}`, `${B.fins} из ${B.starts}`, num(A.fins, B.fins)),
    ...SIDES.map((s, i) => line(s.name, A.sides[i].text, B.sides[i].text, better(s, A.sides[i].value, B.sides[i].value))),
  ].join("");
  const diff = A.clsId !== B.clsId ? `<p class="note">Пилоты в разных классах. Паутинка каждого считается по его классу.</p>` : "";
  const meets = h.meets.length
    ? `<p class="vs-score"><b class="vs-a">${h.a}</b><span>:</span><b class="vs-b">${h.b}</b></p>`
      + `<ol class="vs-list">` + h.meets.map((m) => `<li class="vs-meet"><div class="r-who"><a class="r-name" href="#/g/${m.race.id}/${m.cls.id}">${esc(m.race.name)}</a>`
        + `<span class="r-from">${esc(dateRu(m.race.date))} · ${esc(m.cls.name)}</span></div>`
        + `<span class="vs-a${m.win === "a" ? " vs-win" : ""}">${esc(res(m.a))}</span><span class="vs-b${m.win === "b" ? " vs-win" : ""}">${esc(res(m.b))}</span></li>`).join("") + `</ol>`
    : `<p class="note">В одном классе в одной гонке они ещё не ехали.</p>`;
  return `<header class="page-head"><div class="wrap"><a class="back" href="#/p/${encodeURIComponent(a)}">${ICON.back}${esc(A.name)}</a><h1>Сравнение</h1>`
    + `<div class="vs-top">${head(A, sa, "a")}<a class="vs-swap" href="#/vs/${encodeURIComponent(b)}/${encodeURIComponent(a)}" aria-label="Поменять местами">vs</a>${head(B, sb, "b")}</div></div></header>`
    + `<section class="band band-tight"><div class="wrap vs-grid">`
    + `<div class="sk-fig">${A.shown || B.shown ? radar([{ sides: A.sides, cls: "rd-a" }, { sides: B.sides, cls: "rd-b" }], false) : `<p class="note">Паутинка появится после финиша в гонке сезона.</p>`}${diff}</div>`
    + `<div><ul class="vs-list">${rows}</ul></div></div></section>`
    + `<section class="band band-tight"><div class="wrap"><h2>Личные встречи</h2>${meets}</div></section>`;
}

function res(r) {
  return r.place ? `${r.place} место` : STATUS[r.status]?.short || "";
}

