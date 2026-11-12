// Стороны пилота («паутинка») и сравнение двух пилотов. Чистые функции, без браузера.
// Как в Jumma TT: балл стороны 0..100 значит место среди пилотов своего класса,
// 100 у лучшего, 0 у последнего, равные делят место. Поэтому стороны сравнимы между собой.
//
// Округление: отставание в процентах до десятых, балл до целого.
import { pilotKey } from "./parse.js?v=8c47f740";

/**
 * Шесть сторон по часовой стрелке сверху.
 * min: сколько гонок нужно, чтобы сторону оценить. better: "low" значит меньше лучше.
 */
export const SIDES = [
  { id: "result", name: "Результат", label: "Победитель", min: 1, better: "low" },
  { id: "speed", name: "Скорость", label: "Скоростной", min: 1, better: "low" },
  { id: "clean", name: "Чистота", label: "Чистая езда", min: 1, better: "low" },
  { id: "finish", name: "Надёжность", label: "Железный финишер", min: 2, better: "high" },
  { id: "steady", name: "Стабильность", label: "Как часы", min: 3, better: "low" },
  { id: "form", name: "Форма", label: "На подъёме", min: 3, better: "high" },
];
export const NO_LABEL = "Ищет свою езду";
export const STRONG = 60, WEAK = 40, MIN_SIDES = 3;

/** Отставание от победителя в процентах, до десятых: 66 мин против 60 мин даёт 10. */
export const gapPct = (time, best) => Math.round(((time - best) * 1000) / best) / 10;

const started = (r) => r.status !== "dns" && r.status !== "nodata" && r.status !== "track";

/** Выступления каждого пилота в каждом классе: Map(classId → Map(key → { name, rows })). */
function collect(races) {
  const byClass = new Map();
  const sorted = [...races].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  for (const race of sorted) {
    for (const c of race.classes) {
      const times = c.riders.filter((r) => r.status === "fin").map((r) => r.time);
      const best = times.length ? Math.min(...times) : null;
      if (!byClass.has(c.id)) byClass.set(c.id, new Map());
      const m = byClass.get(c.id);
      for (const r of c.riders) {
        if (!r.name || !started(r)) continue;
        const key = pilotKey(r.name);
        if (!m.has(key)) m.set(key, { key, name: r.name, rows: [] });
        m.get(key).rows.push({ race, rider: r, pct: r.status === "fin" && best ? gapPct(r.time, best) : null });
      }
    }
  }
  return byClass;
}

/** Настоящие значения сторон одного пилота. null: мало гонок. */
function rawSides(rows) {
  const fins = rows.filter((x) => x.rider.status === "fin");
  const out = {};
  out.result = fins.length >= 1 ? fins.reduce((s, x) => s + x.rider.place, 0) / fins.length : null;
  out.speed = fins.length >= 1 ? Math.round((fins.reduce((s, x) => s + x.pct, 0) / fins.length) * 10) / 10 : null;
  out.clean = rows.length >= 1 ? Math.round(rows.reduce((s, x) => s + (x.rider.pen || 0), 0) / rows.length) : null;
  out.finish = rows.length >= 2 ? fins.length / rows.length : null;
  if (fins.length >= 3) {
    const p = fins.map((x) => x.pct);
    out.steady = Math.round((Math.max(...p) - Math.min(...p)) * 10) / 10;
  } else out.steady = null;
  out.form = rows.length >= 3 ? rows.slice(-3).reduce((s, x) => s + (x.rider.points || 0), 0) : null;
  return { values: out, starts: rows.length, fins: fins.length };
}

/** Подпись настоящего значения у вершины. */
export function sideText(id, v, extra = {}) {
  if (v == null) return "-";
  if (id === "result") return `${Number.isInteger(v) ? v : v.toFixed(1)} место`;
  if (id === "speed") return v === 0 ? "лучшее время" : `+${v}%`;
  if (id === "clean") return v === 0 ? "без штрафов" : `${Math.round(v / 60000)} мин`;
  if (id === "finish") return `${extra.fins} из ${extra.starts}`;
  if (id === "steady") return `разброс ${v}%`;
  if (id === "form") return `${v} оч. за 3`;
  return String(v);
}

/** Балл каждой стороны каждого пилота в классе. Итог: Map(classId → Map(key → профиль)). */
export function classSkills(races) {
  const out = new Map();
  for (const [clsId, pilots] of collect(races)) {
    const list = [...pilots.values()].map((p) => ({ ...p, ...rawSides(p.rows) }));
    for (const side of SIDES) {
      const rated = list.filter((p) => p.values[side.id] != null);
      const n = rated.length;
      for (const p of rated) {
        const v = p.values[side.id];
        const better = rated.filter((q) => (side.better === "low" ? q.values[side.id] < v : q.values[side.id] > v)).length;
        const place = better + 1;
        (p.scores ||= {})[side.id] = { score: n === 1 ? 100 : Math.round((100 * (n - place)) / (n - 1)), place, of: n };
      }
    }
    out.set(clsId, new Map(list.map((p) => [p.key, p])));
  }
  return out;
}

/** Класс пилота для паутинки: где он ехал последнюю гонку. */
export function mainClass(races, key) {
  const sorted = [...races].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  for (const race of sorted) for (const c of race.classes) {
    if (c.riders.some((r) => r.name && started(r) && pilotKey(r.name) === key)) return c.id;
  }
  return null;
}

/**
 * Паутинка одного пилота: стороны с баллом, ярлык, сильные и слабая стороны.
 * shown: false, пока оценено меньше трёх сторон.
 */
export function pilotSkills(races, key, all = classSkills(races)) {
  const clsId = mainClass(races, key);
  const p = clsId && all.get(clsId)?.get(key);
  if (!p) return null;
  const sides = SIDES.map((s) => {
    const sc = p.scores?.[s.id];
    return { ...s, value: p.values[s.id], text: sideText(s.id, p.values[s.id], p), score: sc ? sc.score : null, place: sc?.place ?? null, of: sc?.of ?? null };
  });
  const rated = sides.filter((s) => s.score != null);
  const byScore = [...rated].sort((a, b) => b.score - a.score || (a.place - b.place));
  const top = byScore[0];
  const strong = byScore.filter((s) => s.score >= STRONG).slice(0, 2);
  const weakest = [...rated].sort((a, b) => a.score - b.score)[0];
  return {
    clsId, key, name: p.name, sides, starts: p.starts, fins: p.fins,
    shown: rated.length >= MIN_SIDES,
    label: top && top.score >= STRONG ? top.label : NO_LABEL,
    strong,
    weak: weakest && weakest.score <= WEAK && !strong.includes(weakest) ? weakest : null,
  };
}

/**
 * Личные встречи: гонки, где оба ехали в одном классе и хотя бы один финишировал.
 * Финиш выше схода; оба финишировали: выше тот, у кого место лучше.
 */
export function headToHead(races, a, b) {
  const meets = [];
  for (const race of [...races].sort((x, y) => (y.date || "").localeCompare(x.date || ""))) {
    for (const c of race.classes) {
      const ra = c.riders.find((r) => r.name && started(r) && pilotKey(r.name) === a);
      const rb = c.riders.find((r) => r.name && started(r) && pilotKey(r.name) === b);
      if (!ra || !rb || (!ra.place && !rb.place)) continue;
      const win = !rb.place || (ra.place && ra.place < rb.place) ? "a" : !ra.place || rb.place < ra.place ? "b" : "draw";
      meets.push({ race, cls: c, a: ra, b: rb, win });
    }
  }
  return { meets, a: meets.filter((m) => m.win === "a").length, b: meets.filter((m) => m.win === "b").length };
}

/** Кто лучше в строке сравнения: "a", "b" или null. */
export function better(side, va, vb) {
  if (va == null || vb == null || va === vb) return null;
  return (side.better === "low" ? va < vb : va > vb) ? "a" : "b";
}
