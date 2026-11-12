// Цифры пилота для сравнения двух пилотов. Чистые функции, без браузера.
// Считаются гонки сезона во всех классах, где пилот стартовал.
//
// Округление: среднее место и очки за старт до десятых, проценты до десятых (отставание)
// или до целого (обойдённые соперники), время до секунды, штраф до минуты.
import { pilotKey } from "./parse.js?v=a4518193";
import { leaguePoints } from "./results.js?v=a4518193";
import { gapPct } from "./skills.js?v=a4518193";

const started = (r) => r.status !== "dns" && r.status !== "nodata" && r.status !== "track";
const round1 = (x) => Math.round(x * 10) / 10;

/**
 * Строки сравнения по блокам. better: "high" или "low" (меньше лучше).
 * need: сколько нужно финишей (fins) или стартов (starts), чтобы строку посчитать.
 */
export const FACT_GROUPS = [
  { name: "Сезон", rows: [
    { id: "league", name: "Очки лиги", better: "high" },
    { id: "perStart", name: "Очки лиги за старт", better: "high" },
  ] },
  { name: "Результаты", rows: [
    { id: "wins", name: "Победы", better: "high" },
    { id: "podiums", name: "Подиумы (1-3)", better: "high" },
    { id: "top10", name: "В первой десятке", better: "high" },
    { id: "best", name: "Лучшее место", better: "low", need: { fins: 1 } },
    { id: "avgPlace", name: "Среднее место", better: "low", need: { fins: 1 } },
    { id: "beat", name: "Обошёл соперников", better: "high", need: { starts: 1 } },
  ] },
  { name: "Скорость", rows: [
    { id: "gapTime", name: "Отставание от победителя", better: "low", need: { fins: 1 } },
    { id: "gapPct", name: "Отставание в процентах", better: "low", need: { fins: 1 } },
    { id: "bestPct", name: "Лучшая гонка", better: "low", need: { fins: 1 } },
  ] },
  { name: "Надёжность", rows: [
    { id: "finRate", name: "Финиши", better: "high", need: { starts: 1 } },
    { id: "dnf", name: "Без финиша", better: "low" },
    { id: "penRaces", name: "Гонки со штрафом", better: "low" },
    { id: "penMin", name: "Штраф всего", better: "low" },
  ] },
  { name: "Динамика", rows: [
    { id: "streak", name: "Финиши подряд", better: "high" },
    { id: "progress", name: "Прогресс места", better: "high", need: { fins: 2 } },
    { id: "steady", name: "Стабильность", better: "low", need: { fins: 3 } },
    { id: "form", name: "Форма", better: "high", need: { starts: 3 } },
  ] },
];

/** Результат r хуже, чем у me: финиш выше схода, среди финишей меньшее место выше. */
const behind = (q, me) => (me.place ? q.place == null || q.place > me.place : false);

/**
 * Цифры одного пилота. kOf(classId): коэффициент класса в десятых.
 * Итог: { starts, fins, values: { id → число или null } }.
 */
export function pilotFacts(races, key, kOf) {
  const rows = [];
  for (const race of [...races].sort((a, b) => (a.date || "").localeCompare(b.date || ""))) {
    for (const c of race.classes) {
      const me = c.riders.find((r) => r.name && started(r) && pilotKey(r.name) === key);
      if (!me) continue;
      const rivals = c.riders.filter((r) => r !== me && r.name && started(r));
      const times = c.riders.filter((r) => r.status === "fin").map((r) => r.time);
      const best = times.length ? Math.min(...times) : null;
      rows.push({ r: me, k: kOf(c.id), rivals: rivals.length, behind: rivals.filter((q) => behind(q, me)).length, best });
    }
  }
  const fins = rows.filter((x) => x.r.status === "fin" && x.r.place);
  const places = fins.map((x) => x.r.place);
  const league = rows.reduce((s, x) => s + leaguePoints(x.r.points, x.k), 0);
  const rivals = rows.reduce((s, x) => s + x.rivals, 0);
  const gaps = fins.filter((x) => x.best).map((x) => ({ ms: x.r.time - x.best, pct: gapPct(x.r.time, x.best) }));
  const pen = rows.reduce((s, x) => s + (x.r.pen || 0), 0);
  let streak = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i].r.place; i--) streak += 1;
  const v = {
    league,
    perStart: rows.length ? round1(league / rows.length) : null,
    wins: places.filter((p) => p === 1).length,
    podiums: places.filter((p) => p <= 3).length,
    top10: places.filter((p) => p <= 10).length,
    best: places.length ? Math.min(...places) : null,
    avgPlace: places.length ? round1(places.reduce((s, p) => s + p, 0) / places.length) : null,
    beat: rivals ? Math.round((100 * rows.reduce((s, x) => s + x.behind, 0)) / rivals) : null,
    gapTime: gaps.length ? Math.round(gaps.reduce((s, g) => s + g.ms, 0) / gaps.length / 1000) * 1000 : null,
    gapPct: gaps.length ? round1(gaps.reduce((s, g) => s + g.pct, 0) / gaps.length) : null,
    bestPct: gaps.length ? Math.min(...gaps.map((g) => g.pct)) : null,
    finRate: rows.length ? Math.round((100 * fins.length) / rows.length) : null,
    dnf: rows.length - fins.length,
    penRaces: rows.filter((x) => x.r.pen > 0).length,
    penMin: Math.round(pen / 60000),
    streak,
    progress: fins.length >= 2 ? fins[0].r.place - fins[fins.length - 1].r.place : null,
    steady: fins.length >= 3 ? round1(Math.max(...gaps.map((g) => g.pct)) - Math.min(...gaps.map((g) => g.pct))) : null,
    form: rows.length >= 3 ? rows.slice(-3).reduce((s, x) => s + leaguePoints(x.r.points, x.k), 0) : null,
  };
  return { starts: rows.length, fins: fins.length, values: v };
}

/** Кто лучше в строке: "a", "b" или null. */
export function factWinner(row, va, vb) {
  if (va == null || vb == null || va === vb) return null;
  return (row.better === "low" ? va < vb : va > vb) ? "a" : "b";
}

/** Сколько строк выиграл каждый пилот. */
export function tally(A, B) {
  let a = 0, b = 0, n = 0;
  for (const g of FACT_GROUPS) for (const row of g.rows) {
    const va = A.values[row.id], vb = B.values[row.id];
    if (va == null || vb == null) continue;
    n += 1;
    const w = factWinner(row, va, vb);
    if (w === "a") a += 1; else if (w === "b") b += 1;
  }
  return { a, b, n };
}
