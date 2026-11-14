// Картинка результата пилота для WhatsApp и историй: 1080×1350, рисуется на холсте.
// Цвета берутся из css/tokens.css, шрифты те же, что на сайте. Чужих библиотек нет.
// Телефон: «Поделиться» отдаёт картинку в WhatsApp или в истории. Компьютер: «Скачать».
import { esc, dur, dateRu, plural, STATUS } from "./format.js?v=e7a2151d";
import { LEAGUE } from "../races.js?v=e7a2151d";

const W = 1080, H = 1350, PAD = 84;

/** Что написано на картинке. Чистая функция: строка из pilotHistory на входе. */
export function cardFacts({ race, cls, rider: r }) {
  const fin = r.status === "fin";
  return {
    race: race.name, when: [dateRu(race.date), race.place].filter(Boolean).join(" · "),
    cls: cls.name, clsId: cls.id, n: r.n, name: r.name, from: r.from || r.village || "",
    place: fin ? r.place : null,
    status: fin ? "место" : STATUS[r.status].short,
    stats: fin ? [
      ["Время", dur(r.time)],
      ["Отставание", r.gap ? "+" + dur(r.gap) : "лучшее время"],
      ["Очки", `${r.points} ${plural(r.points, "очко", "очка", "очков")}`],
    ] : [],
  };
}

/** Текст по словам в строки не шире max. Не больше lines строк, последняя с многоточием. */
function wrap(ctx, text, max, lines) {
  const out = [];
  let cur = "";
  for (const w of String(text).split(/\s+/)) {
    const next = cur ? cur + " " + w : w;
    if (ctx.measureText(next).width <= max || !cur) cur = next; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] += "…"; }
  return out;
}

function draw(ctx, f) {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const display = (px) => `800 ${px}px Manrope, "Golos Text", system-ui, sans-serif`;
  const body = (px, w = 500) => `${w} ${px}px "Golos Text", system-ui, sans-serif`;
  const cls = v(`--cls-${f.clsId}`) || v("--brand");
  const medal = f.place && f.place <= 3 ? v(["--gold", "--silver", "--bronze"][f.place - 1]) : v("--ink");

  ctx.fillStyle = v("--bg"); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cls; ctx.fillRect(0, 0, 20, H);
  ctx.textBaseline = "alphabetic";

  // Знак и имя лиги
  ctx.save(); ctx.translate(PAD - 6, 70); ctx.scale(2.2, 2.2);
  ctx.fillStyle = v("--brand"); ctx.fill(new Path2D("M6 4 H26 A2 2 0 0 1 28 6 V19 A9 9 0 0 1 19 28 H13 A9 9 0 0 1 4 19 V6 A2 2 0 0 1 6 4 Z"));
  ctx.strokeStyle = v("--fire-ink"); ctx.lineWidth = 4; ctx.stroke(new Path2D("M10.5 9 L21.5 22 M21.5 9 L10.5 22")); ctx.restore();
  ctx.font = display(44); ctx.fillStyle = v("--ink"); ctx.fillText("XASI", PAD + 84, 128);
  ctx.fillStyle = v("--brand"); ctx.fillText("ENDURO", PAD + 84 + ctx.measureText("XASI ").width, 128);
  ctx.font = body(32, 600); ctx.fillStyle = v("--muted"); ctx.textAlign = "right";
  ctx.fillText(`Сезон ${LEAGUE.season}`, W - PAD, 126); ctx.textAlign = "left";

  // Гонка
  let y = 250;
  ctx.font = display(60); ctx.fillStyle = v("--ink");
  for (const line of wrap(ctx, f.race, W - PAD * 2, 2)) { ctx.fillText(line, PAD, y); y += 70; }
  ctx.font = body(32); ctx.fillStyle = v("--muted");
  ctx.fillText(wrap(ctx, f.when, W - PAD * 2, 1)[0], PAD, y - 14);

  // Место или состояние
  if (f.place) {
    ctx.font = display(400); ctx.fillStyle = medal; ctx.fillText(String(f.place), PAD - 14, 760);
    const w = ctx.measureText(String(f.place)).width;
    ctx.font = display(64); ctx.fillStyle = v("--ink"); ctx.fillText("место", PAD + w + 16, 760);
  } else {
    ctx.font = display(96); ctx.fillStyle = v("--muted"); ctx.fillText(f.status, PAD, 700);
  }

  // Класс и стартовый номер в цвете класса
  ctx.font = display(40);
  const label = `${f.cls} · № ${f.n ?? "?"}`;
  const lw = ctx.measureText(label).width + 56;
  ctx.fillStyle = cls; ctx.beginPath(); ctx.roundRect(PAD, 820, lw, 76, [12, 12, 26, 26]); ctx.fill();
  ctx.fillStyle = v("--plate-ink"); ctx.fillText(label, PAD + 28, 873);

  // Пилот
  y = 1000;
  ctx.font = display(76); ctx.fillStyle = v("--ink");
  for (const line of wrap(ctx, f.name, W - PAD * 2, 2)) { ctx.fillText(line, PAD, y); y += 84; }
  if (f.from) { ctx.font = body(36); ctx.fillStyle = v("--muted"); ctx.fillText(wrap(ctx, f.from, W - PAD * 2, 1)[0], PAD, y - 26); }

  // Цифры
  ctx.fillStyle = v("--line"); ctx.fillRect(PAD, 1150, W - PAD * 2, 2);
  const col = (W - PAD * 2) / 3;
  f.stats.forEach(([k, val], i) => {
    ctx.font = body(28); ctx.fillStyle = v("--muted"); ctx.fillText(k, PAD + col * i, 1200);
    ctx.font = display(val.length > 9 ? 36 : 50); ctx.fillStyle = v("--ink"); ctx.fillText(val, PAD + col * i, 1258);
  });
  ctx.font = body(28); ctx.fillStyle = v("--muted");
  ctx.fillText((location.host + location.pathname).replace(/\/$/, ""), PAD, H - 36);
}

async function render(f) {
  await Promise.all([document.fonts.load('800 60px Manrope', f.name), document.fonts.load('500 32px "Golos Text"', f.name)]).catch(() => {});
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  draw(c.getContext("2d"), f);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

/** Окно с картинкой: «Поделиться» (если телефон умеет отдавать файлы) и «Скачать». */
export async function openCard(rowOfPilot, from) {
  if (document.querySelector(".fb-sheet")) return;
  const f = cardFacts(rowOfPilot);
  const blob = await render(f);
  if (!blob) return;
  const file = new File([blob], `xasi-enduro-${f.name.replace(/\s+/g, "-")}.png`, { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const text = `${f.name}: ${f.race}, ${f.cls}${f.place ? `, ${f.place} место` : ""}. ${location.href}`;
  const canShare = !!navigator.canShare?.({ files: [file] });
  const back = document.createElement("div");
  back.className = "fb-back";
  const box = document.createElement("div");
  box.className = "fb-sheet card-sheet";
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "card-h");
  box.innerHTML = `<div class="fb-head"><h2 id="card-h">Картинка результата</h2>`
    + `<button class="fb-x" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`
    + `<img class="card-img" src="${url}" width="${W}" height="${H}" alt="${esc(`Картинка: ${f.name}, ${f.race}, ${f.cls}`)}">`
    + `<div class="cta">${canShare ? `<button class="btn btn-fire" type="button" data-share>Поделиться</button>` : ""}`
    + `<a class="btn ${canShare ? "btn-ghost" : "btn-fire"}" href="${url}" download="${esc(file.name)}">Скачать</a></div>`
    + `<p class="fb-note">Картинка для WhatsApp и историй. Данные из таблицы организатора.</p>`;
  const close = () => { back.remove(); box.remove(); URL.revokeObjectURL(url); document.removeEventListener("keydown", onKey); window.removeEventListener("hashchange", close); from?.focus(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  back.addEventListener("click", close);
  box.querySelector(".fb-x").addEventListener("click", close);
  box.querySelector("[data-share]")?.addEventListener("click", () => navigator.share({ files: [file], text }).catch(() => {}));
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", close); // переход на другой экран закрывает окно
  document.body.append(back, box);
  box.querySelector(".fb-x").focus();
}
