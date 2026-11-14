// Загрузка листов из таблиц Google.
//
// Быстрый показ: если в телефоне есть прошлая копия гонки, экран открывается с ней сразу,
// а свежие данные идут из сети в фоне. Пришли другие: onFresh() сообщает app.js, экран
// тихо обновляется. Копии нет (первый заход): ждём сеть.
//
// Как читаем лист:
// 1. Номер листа (gid) по имени. Сначала из записи гонки (races.js, gids), иначе со
//    страницы просмотра таблицы: это лишний запрос в 1-2 секунды.
// 2. Выгрузка CSV по номеру листа даёт клетки как есть, со словами «Не Финишировал».
// Запасной путь gviz: он выбрасывает слова из столбцов со временем, поэтому только если
// первые два шага не сработали.
import { parseCsv, readSheet, sheetGids } from "./domain/parse.js?v=e7a2151d";
import { rankClass, raceState } from "./domain/results.js?v=e7a2151d";
import { CLASSES } from "./races.js?v=e7a2151d";

const BASE = "https://docs.google.com/spreadsheets/d/";
const memo = new Map();
const gidMemo = new Map();
const pending = new Map();
const listeners = new Set();

function saveCopy(id, data) {
  try { localStorage.setItem("race:" + id, JSON.stringify(data)); } catch { /* браузер не даёт хранить */ }
}
function readCopy(id) {
  try { return JSON.parse(localStorage.getItem("race:" + id) || "null"); } catch { return null; }
}

async function getText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Таблица ответила " + res.status);
  return res.text();
}

async function gidsOf(race) {
  if (race.gids) return race.gids;
  if (gidMemo.has(race.sheet)) return gidMemo.get(race.sheet);
  const map = sheetGids(await getText(`${BASE}${race.sheet}/htmlview`));
  if (Object.keys(map).length) gidMemo.set(race.sheet, map);
  return map;
}

async function fetchSheet(race, name) {
  let gids = {};
  try { gids = await gidsOf(race); } catch { /* пойдём запасным путём */ }
  const gid = gids[name];
  if (gid) {
    try {
      const text = await getText(`${BASE}${race.sheet}/export?format=csv&gid=${gid}`);
      if (!/^\s*</.test(text)) return parseCsv(text);
    } catch { /* номер листа устарел: запасной путь */ }
  } else if (Object.keys(gids).length) return []; // листа с таким именем нет: класс пустой
  const text = await getText(`${BASE}${race.sheet}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`);
  if (/^\s*</.test(text)) throw new Error("Таблица закрыта");
  return parseCsv(text);
}

/** Сырые листы в гонку с классами, местами и очками. */
function build(race, raw, stale) {
  const classes = CLASSES.map((c, i) => {
    const riders = readSheet(raw.lists[i] || []);
    const ranked = rankClass(riders);
    return { ...c, riders, fin: ranked.fin, rest: ranked.rest };
  });
  return { ...race, classes, state: raceState(classes), loadedAt: raw.at, stale };
}

/** Листы гонки из сети. Один запрос на гонку за раз. */
function fetchRaw(race) {
  if (pending.has(race.id)) return pending.get(race.id);
  const p = Promise.all(CLASSES.map((c) => fetchSheet(race, c.name)))
    .then((lists) => { const raw = { at: Date.now(), lists }; saveCopy(race.id, raw); return raw; })
    .finally(() => pending.delete(race.id));
  pending.set(race.id, p);
  return p;
}

/** Свежие данные гонки пришли в фоне и отличаются от показанных. */
export function onFresh(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Гонка с классами, местами и очками. fresh: true значит заново из сети. */
export async function loadRace(race, { fresh = false } = {}) {
  if (!fresh && memo.has(race.id)) return memo.get(race.id);
  const copy = readCopy(race.id);
  if (!fresh && copy) {
    // Показать копию сразу, сеть в фоне.
    const data = build(race, copy, false);
    memo.set(race.id, data);
    fetchRaw(race).then((raw) => {
      if (JSON.stringify(raw.lists) === JSON.stringify(copy.lists)) { memo.get(race.id).loadedAt = raw.at; return; }
      memo.set(race.id, build(race, raw, false));
      listeners.forEach((fn) => fn(race.id));
    }).catch(() => { const d = memo.get(race.id); if (d) d.stale = true; });
    return data;
  }
  let data;
  try {
    data = build(race, await fetchRaw(race), false);
  } catch (err) {
    if (!copy) throw err;
    data = build(race, copy, true);
  }
  memo.set(race.id, data);
  return data;
}

/** Все гонки. Гонка, которая не загрузилась, не ломает остальные. */
export async function loadAll(races, opts) {
  const res = await Promise.allSettled(races.map((r) => loadRace(r, opts)));
  return res.map((r, i) => (r.status === "fulfilled" ? r.value : { ...races[i], error: true, classes: [] }));
}
