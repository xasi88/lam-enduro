// Общая таблица сезона и страница пилота. Чистые функции, без браузера.
import { pilotKey } from "./parse.js?v=1466f04a";

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
