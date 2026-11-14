// Общая таблица сезона и страница пилота. Чистые функции, без браузера.
import { pilotKey } from "./parse.js?v=e7a2151d";
import { leaguePoints } from "./results.js?v=e7a2151d";

/**
 * races: [{ id, name, date, classes: [{ id, name, riders }] }], места уже поставлены.
 * Итог: по каждому классу список пилотов с очками, местами, числом гонок.
 * Пилот узнаётся по фамилии и имени. Очки идут в класс, где он ехал.
 */
export function seasonTable(races) {
  const byClass = new Map();
  for (const race of races) {
    for (const c of race.classes) {
      if (!byClass.has(c.id)) byClass.set(c.id, { id: c.id, name: c.name, pilots: new Map() });
      const pilots = byClass.get(c.id).pilots;
      for (const r of c.riders) {
        if (!r.name || r.status === "nodata") continue;
        const key = pilotKey(r.name);
        if (!pilots.has(key)) pilots.set(key, { key, name: r.name, village: r.village, team: r.team, points: 0, starts: 0, places: [] });
        const p = pilots.get(key);
        p.village = r.village || p.village;
        p.team = r.team || p.team;
        if (r.status !== "dns") p.starts += 1;
        p.points += r.points || 0;
        if (r.place) p.places.push(r.place);
      }
    }
  }
  const out = [];
  for (const cls of byClass.values()) {
    const list = [...cls.pilots.values()].filter((p) => p.starts > 0);
    list.forEach((p) => p.places.sort((a, b) => a - b));
    list.sort((a, b) => b.points - a.points || cmpPlaces(a.places, b.places) || a.name.localeCompare(b.name, "ru"));
    list.forEach((p, i) => {
      const prev = list[i - 1];
      p.rank = prev && prev.points === p.points && cmpPlaces(prev.places, p.places) === 0 ? prev.rank : i + 1;
    });
    out.push({ id: cls.id, name: cls.name, pilots: list });
  }
  return out;
}

// Равные очки: выше тот, у кого лучше места (больше побед, потом вторых мест и так далее).
function cmpPlaces(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 1e9, y = b[i] ?? 1e9;
    if (x !== y) return x - y;
  }
  return 0;
}

/** Все выступления одного пилота по гонкам. */
export function pilotHistory(races, key) {
  const rows = [];
  for (const race of races) {
    for (const c of race.classes) {
      for (const r of c.riders) {
        if (r.name && pilotKey(r.name) === key) rows.push({ race, cls: c, rider: r });
      }
    }
  }
  return rows;
}

/**
 * Цифры пилота для карточек на его странице: гонки, финиши, лучшее место, очки.
 * rows из pilotHistory. series: по гонкам от старой к новой, последние 10, для столбиков.
 */
export function pilotStats(rows) {
  const list = [...rows].sort((a, b) => a.race.date.localeCompare(b.race.date));
  const places = list.map((x) => x.rider.place).filter((p) => p != null);
  return {
    starts: list.length,
    finishes: places.length,
    best: places.length ? Math.min(...places) : null,
    points: list.reduce((s, x) => s + (x.rider.points || 0), 0),
    series: list.slice(-10).map((x) => ({ place: x.rider.place ?? null, points: x.rider.points || 0 })),
  };
}

/** Сезоны по годам из списка гонок, новый сверху. Пустой список: текущий год лиги. */
export function seasonsOf(races, fallback) {
  const years = [...new Set(races.map((r) => r.season).filter(Number.isInteger))].sort((a, b) => b - a);
  return years.length ? years : [fallback];
}

/** Гонки по годам, новые сверху: [{ year, races }]. */
export function racesByYear(races) {
  const m = new Map();
  for (const r of [...races].sort((a, b) => b.date.localeCompare(a.date))) {
    const y = r.season ?? Number(r.date.slice(0, 4));
    if (!m.has(y)) m.set(y, []);
    m.get(y).push(r);
  }
  return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, races: list }));
}

/**
 * Общий зачёт лиги: все классы одним списком по очкам лиги (очки за место × коэффициент класса).
 * kOf(classId) даёт коэффициент в десятых. cls: класс, где пилот набрал больше очков лиги.
 * Равные очки: больше побед, потом вторых мест и так далее, как в классе.
 */
export function leagueTable(races, kOf) {
  const m = new Map();
  for (const race of races) for (const c of race.classes) for (const r of c.riders) {
    if (!r.name || r.status === "nodata") continue;
    const key = pilotKey(r.name);
    if (!m.has(key)) m.set(key, { key, name: r.name, village: r.village, team: r.team, points: 0, starts: 0, places: [], byCls: {} });
    const p = m.get(key);
    p.village = r.village || p.village;
    p.team = r.team || p.team;
    if (r.status !== "dns") p.starts += 1;
    const pts = leaguePoints(r.points, kOf(c.id));
    p.points += pts;
    p.byCls[c.id] = (p.byCls[c.id] ?? 0) + pts;
    if (r.place) p.places.push(r.place);
  }
  const list = [...m.values()].filter((p) => p.starts > 0);
  for (const p of list) {
    p.places.sort((a, b) => a - b);
    p.cls = Object.entries(p.byCls).sort((a, b) => b[1] - a[1])[0][0];
  }
  list.sort((a, b) => b.points - a.points || cmpPlaces(a.places, b.places) || a.name.localeCompare(b.name, "ru"));
  list.forEach((p, i) => {
    const prev = list[i - 1];
    p.rank = prev && prev.points === p.points && cmpPlaces(prev.places, p.places) === 0 ? prev.rank : i + 1;
  });
  return list;
}
