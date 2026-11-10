// Чтение листа таблицы организатора. Без браузера: работает и в тестах Node.
// Время храним в миллисекундах от полуночи (старт, финиш) или как длительность (штраф).

/** Разбирает CSV (как отдаёт Google) в массив строк. */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Страница просмотра таблицы (htmlview) → { имя листа: номер листа (gid) }. */
export function sheetGids(html) {
  const out = {};
  const re = /name:\s*"((?:[^"\\]|\\.)*)"[^}]*?gid:\s*"(\d+)"/g;
  let m;
  while ((m = re.exec(String(html)))) {
    let name = m[1];
    try { name = JSON.parse(`"${name}"`); } catch { /* имя без экранирования */ }
    out[name.trim()] = m[2];
  }
  return out;
}

/** «9:18», «9:18:00», «1:30:00» → миллисекунды. Пусто или текст → null. */
export function parseTime(s) {
  const m = String(s ?? "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return ((+m[1] * 60 + +m[2]) * 60 + +(m[3] || 0)) * 1000;
}

// Одно село в таблицах записано по-разному. Сводим к одному написанию.
const ONE_VILLAGE = {
  "б1ачи-юрт": "Бачи-Юрт", "алхазурова": "Алхазурово", "новые-атаги": "Новые Атаги",
  "марта-чу": "Мартан-Чу", "илсхан юрт": "Илсхан-Юрт", "рошни чу": "Рошни-Чу",
  "алахан-калинский": "Алхан-Кала", "алхан-калинский": "Алхан-Кала",
};
export function oneVillage(v) {
  if (!v) return null;
  const k = v.trim().toLowerCase();
  return ONE_VILLAGE[k] || v.trim();
}

/** Клетка «Ф. И. Откуда» → имя, село, команда, прозвище. */
export function splitWho(cell) {
  let s = String(cell ?? "").replace(/\s+/g, " ").trim();
  if (!s) return { name: null, from: null, village: null, team: null, tag: null };
  let team = null, tag = null;
  const t = s.match(/Команда\s*"?([^"]+?)"?\s*$/i);
  if (t) { team = t[1].trim(); s = s.slice(0, t.index).trim(); }
  const q = s.match(/"([^"]+)"\s*$/);
  if (q) { tag = q[1].trim(); s = s.slice(0, q.index).trim(); }
  let name = s, from = null;
  const p = s.match(/\s(с\.|г\.|ст\.)\s*(.+)$/);
  if (p) { name = s.slice(0, p.index).trim(); from = `${p[1]} ${p[2].trim()}`; }
  else {
    const w = s.split(" ");
    if (w.length >= 3) { name = w.slice(0, 2).join(" "); from = w.slice(2).join(" "); }
  }
  const village = from ? oneVillage(from.replace(/^(с\.|г\.|ст\.)\s*/, "")) : null;
  return { name: name || null, from, village, team, tag };
}

/** Ключ пилота для общей таблицы: фамилия и имя без регистра и лишних знаков. */
export function pilotKey(name) {
  return String(name ?? "").toLowerCase().replace(/ё/g, "е").replace(/[1ӏьъ'"«»\-\s.]/g, "");
}

const pick = (head, ...words) => head.findIndex((h) => words.some((w) => h.includes(w)));

/**
 * Строки листа → участники. Столбцы ищем по заголовку:
 * «№», «Ф. И. Откуда», «Старт», «Финиш», «Штрафы».
 * Статусы: fin (есть финиш), dnf (сход), dns (не стартовал), track (на трассе), nodata (нет данных).
 */
export function readSheet(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = {
    n: pick(head, "№", "номер"), who: pick(head, "ф. и", "фио", "имя"),
    start: pick(head, "старт"), finish: pick(head, "финиш"), pen: pick(head, "штраф"),
  };
  const get = (r, k) => (col[k] >= 0 ? String(r[col[k]] ?? "").trim() : "");
  const out = [];
  for (const r of rows.slice(1)) {
    const who = splitWho(get(r, "who"));
    const n = parseInt(get(r, "n"), 10);
    if (!who.name && !Number.isFinite(n)) continue;
    const startTxt = get(r, "start"), finTxt = get(r, "finish");
    const start = parseTime(startTxt), finish = parseTime(finTxt);
    const pen = parseTime(get(r, "pen")) || 0;
    let status;
    if (/не\s*старт/i.test(startTxt)) status = "dns";
    else if (/не\s*фин|сош|сход/i.test(finTxt)) status = "dnf";
    else if (/дискв/i.test(startTxt + finTxt)) status = "dsq";
    else if (start != null && finish != null) status = "fin";
    else if (start != null) status = "track";
    else status = "nodata";
    const rider = { ...who, n: Number.isFinite(n) ? n : null, start, finish, pen, status, time: null };
    if (status === "fin") {
      let ride = finish - start;
      if (ride < 0) ride += 24 * 3600 * 1000;
      rider.ride = ride;
      rider.time = ride + pen;
    }
    out.push(rider);
  }
  return out;
}
