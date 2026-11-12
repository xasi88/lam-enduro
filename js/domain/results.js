// Места и очки одной гонки в одном классе. Чистые функции, без браузера.

/** Очки за место, как в мотокроссе: 25, 22, 20, 18, 16, 15, 14 ... 1. После 20 места: 0. */
export const POINTS = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const pointsFor = (place) => (place >= 1 && place <= POINTS.length ? POINTS[place - 1] : 0);

/**
 * Очки лиги: очки за место × коэффициент класса. k в десятых (15 = ×1,5).
 * Округление до целого, половина вверх: 25 × 1,5 = 37,5 даёт 38. Без дробей: (очки × k + 5) / 10 вниз.
 */
export const leaguePoints = (points, k = 10) => Math.floor(((points || 0) * k + 5) / 10);

/**
 * Ставит места, отставание и очки. Финиш сортируем по итоговому времени.
 * Равное время: одно место на двоих, следующий через одно (1, 2, 2, 4).
 * Сход, неявка, дисквалификация, нет данных, на трассе: без места и очков.
 */
export function rankClass(riders) {
  const fin = riders.filter((r) => r.status === "fin")
    .sort((a, b) => a.time - b.time || (a.n ?? 1e9) - (b.n ?? 1e9));
  fin.forEach((r, i) => {
    r.place = i && r.time === fin[i - 1].time ? fin[i - 1].place : i + 1;
    r.gap = r.time - fin[0].time;
    r.points = pointsFor(r.place);
  });
  for (const r of riders) if (r.status !== "fin") { r.place = null; r.gap = null; r.points = 0; }
  const ORDER = { track: 0, dnf: 1, dsq: 2, dns: 3, nodata: 4 };
  const rest = riders.filter((r) => r.status !== "fin")
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.n ?? 1e9) - (b.n ?? 1e9));
  return { fin, rest };
}

/** Состояние гонки по данным: скоро, идёт, итоги. */
export function raceState(classes) {
  const all = classes.flatMap((c) => c.riders);
  if (!all.some((r) => r.start != null || r.status === "dns" || r.status === "dnf")) return "soon";
  if (all.some((r) => r.status === "track")) return "live";
  return "done";
}
