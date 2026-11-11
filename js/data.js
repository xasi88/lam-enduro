// Загрузка листов из таблиц Google. Каждый раз свежие данные; последняя удачная копия
// лежит в браузере на случай, если сеть пропала.
//
// Как читаем лист:
// 1. Страница просмотра таблицы даёт номера листов (gid) по именам.
// 2. Выгрузка CSV по номеру листа даёт клетки как есть, со словами «Не Финишировал».
// Запасной путь gviz: он выбрасывает слова из столбцов со временем, поэтому только если
// первые два шага не сработали.
import { parseCsv, readSheet, sheetGids } from "./domain/parse.js?v=9215d078";
import { rankClass, raceState } from "./domain/results.js?v=9215d078";
import { CLASSES } from "./races.js?v=9215d078";

const BASE = "https://docs.google.com/spreadsheets/d/";
const memo = new Map();
const gidMemo = new Map();

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
    const text = await getText(`${BASE}${race.sheet}/export?format=csv&gid=${gid}`);
    if (!/^\s*</.test(text)) return parseCsv(text);
  }
  if (Object.keys(gids).length && !gid) return []; // листа с таким именем нет: класс пустой
  const text = await getText(`${BASE}${race.sheet}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`);
  if (/^\s*</.test(text)) throw new Error("Таблица закрыта");
  return parseCsv(text);
}

/** Гонка с классами, местами и очками. fresh: true значит заново из сети. */
export async function loadRace(race, { fresh = false } = {}) {
  if (!fresh && memo.has(race.id)) return memo.get(race.id);
  let raw, stale = false;
  try {
    const lists = await Promise.all(CLASSES.map((c) => fetchSheet(race, c.name)));
    raw = { at: Date.now(), lists };
    saveCopy(race.id, raw);
  } catch (err) {
    raw = readCopy(race.id);
    if (!raw) throw err;
    stale = true;
  }
  const classes = CLASSES.map((c, i) => {
    const riders = readSheet(raw.lists[i] || []);
    const ranked = rankClass(riders);
    return { ...c, riders, fin: ranked.fin, rest: ranked.rest };
  });
  const data = { ...race, classes, state: raceState(classes), loadedAt: raw.at, stale };
  memo.set(race.id, data);
  return data;
}

/** Все гонки. Гонка, которая не загрузилась, не ломает остальные. */
export async function loadAll(races, opts) {
  const res = await Promise.allSettled(races.map((r) => loadRace(r, opts)));
  return res.map((r, i) => (r.status === "fulfilled" ? r.value : { ...races[i], error: true, classes: [] }));
}
