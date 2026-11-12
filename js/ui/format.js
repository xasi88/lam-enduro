// Показ времени, чисел и слов. Время приходит в миллисекундах.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");

/** Длительность: 1:56:28 */
export function dur(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
/** Время дня: 9:18 или 11:14:28 */
export function clock(ms) {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return x ? `${h}:${pad(m)}:${pad(x)}` : `${h}:${pad(m)}`;
}
/** Штраф: «1 ч 30 мин», «30 мин» */
export function penText(ms) {
  const m = Math.round(ms / 60000), h = Math.floor(m / 60), r = m % 60;
  return [h ? `${h} ч` : "", r ? `${r} мин` : ""].filter(Boolean).join(" ");
}
export function plural(n, one, few, many) {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}
export const dateRu = (iso, year = true) =>
  new Date(iso + "T12:00:00").toLocaleDateString("ru-RU", year ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
export const timeNow = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const STATUS = {
  dnf: { title: "Не финишировали", text: "Пилот стартовал, но не доехал до финиша.", short: "Не финишировал" },
  dsq: { title: "Дисквалификация", text: "Пилот снят с гонки.", short: "Снят" },
  dns: { title: "Не стартовали", text: "Пилот записан, но не вышел на старт.", short: "Не стартовал" },
  track: { title: "На трассе", text: "Старт есть, финиша пока нет.", short: "На трассе" },
  nodata: { title: "Нет данных", text: "В таблице пока нет старта и финиша.", short: "Нет данных" },
};

export const STATE = {
  soon: { label: "Скоро", cls: "st-soon" },
  live: { label: "Идёт гонка", cls: "st-live" },
  done: { label: "Итоги", cls: "st-done" },
};
