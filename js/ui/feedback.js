// Кнопка «Замечание» на каждом экране, как в TanWin: снимок экрана, время, экран, телефон
// и текст человека уходят автору в WhatsApp.
// Телефон: «Поделиться» отдаёт снимок и текст вместе, человек выбирает WhatsApp и чат автора.
// Компьютер или старый браузер: снимок скачивается, чат автора открывается с готовым текстом.
// Библиотека снимка (js/vendor/modern-screenshot.js) грузится только по нажатию.
import { VERSION } from "../version.js?v=e7a2151d";
import { me } from "../store.js?v=e7a2151d";
import { esc } from "./format.js?v=e7a2151d";

export const WHATSAPP = "79659696053"; // Хаси Абдуллах, номер из Контакты.md
const DRAFT = "xe-fb-draft";

const KINDS = [
  ["Ошибка", "Что пошло не так? Например: не открывается гонка, неверное время, кнопка не нажимается."],
  ["Неточность", "Где неточность: место, время, имя, очки?"],
  ["Идея", "Что добавить или сделать удобнее?"],
  ["Другое", "Вопрос, пожелание, отзыв."],
];

const ICON_MSG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';

/** Модель телефона, система и браузер из строки браузера. */
export function deviceOf(ua) {
  let os = "";
  const android = ua.match(/Android ([\d.]+);\s*([^;)]+?)(?:\s+Build|\))/);
  if (android) os = `Android ${android[1]}${/^(K|wv)$/.test(android[2].trim()) ? "" : ", " + android[2].trim()}`;
  else if (/iPhone|iPad|iPod/.test(ua)) os = `${ua.match(/iPad/) ? "iPad" : "iPhone"}, iOS ${(ua.match(/OS (\d+[_\d]*)/)?.[1] || "?").replace(/_/g, ".")}`;
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "Mac";
  else if (/Linux/.test(ua)) os = "Linux";
  const br = [["YaBrowser", "Яндекс Браузер"], ["SamsungBrowser", "Samsung Internet"], ["OPR", "Opera"], ["Edg", "Edge"],
    ["Firefox", "Firefox"], ["FxiOS", "Firefox"], ["CriOS", "Chrome"], ["Chrome", "Chrome"], ["Safari", "Safari"]]
    .find(([k]) => ua.includes(k + "/"));
  const ver = br && ua.match(new RegExp((br[0] === "Safari" ? "Version" : br[0]) + "/(\\d+)"))?.[1];
  return [os, br ? `${br[1]} ${ver || ""}`.trim() : ""].filter(Boolean).join(", ") || "неизвестно";
}

function facts() {
  const dark = document.documentElement.dataset.theme === "dark";
  const app = matchMedia("(display-mode: standalone)").matches || navigator.standalone ? "приложение" : "браузер";
  const net = navigator.connection?.effectiveType;
  const now = new Date();
  return {
    time: now.toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    stamp: now.toISOString().slice(0, 19).replace(/[T:]/g, "-"),
    screen: document.title.replace(/ · XASI ENDURO$/, ""),
    path: location.hash || "#/",
    device: deviceOf(navigator.userAgent),
    size: `экран ${innerWidth}×${innerHeight}, плотность ${Math.round(devicePixelRatio * 100) / 100}, ${app}, тема ${dark ? "тёмная" : "светлая"}`
      + (net ? `, сеть ${net}` : "") + (navigator.onLine ? "" : ", без сети"),
    pilot: me.get() ? me.name() : "",
  };
}

export function message(kind, text, f) {
  return [
    `XASI ENDURO ${VERSION} · ${kind}`,
    `Время: ${f.time}`,
    `Экран: ${f.screen} (${f.path})`,
    `Телефон: ${f.device}`,
    `Вид: ${f.size}`,
    f.pilot ? `Пилот в профиле: ${f.pilot}` : null,
    "",
    (text || "").trim() || "…",
  ].filter((x) => x !== null).join("\n");
}

/** Снимок видимой части экрана, без кнопки и окна замечания. */
async function shot() {
  const { domToBlob } = await import("../vendor/modern-screenshot.js?v=e7a2151d");
  const bg = getComputedStyle(document.body).backgroundColor;
  // Ленивые картинки ниже экрана не грузятся, а библиотека ждёт каждую: грузим сразу.
  document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; });
  // Снимаем всю страницу, сдвинутую на прокрутку. Шапка (sticky) и нижний бар (fixed) в копии
  // ставятся туда, где их видит человек.
  const y = scrollY;
  const top = document.querySelector(".topbar");
  const dock = document.querySelector(".dock")?.getBoundingClientRect();
  // Шапка прилипает к верху: на экране она на y + rect.top, а в копии стоит на своём месте в потоке.
  let shift = 0;
  if (top) {
    const seen = top.getBoundingClientRect().top;
    top.style.position = "static";
    shift = seen - top.getBoundingClientRect().top; // без перерисовки: стиль вернётся до кадра
    top.style.position = "";
  }
  return domToBlob(document.body, {
    width: innerWidth, height: innerHeight, backgroundColor: bg, timeout: 1500, scale: Math.min(devicePixelRatio || 1, 2), type: "image/jpeg", quality: 0.85,
    style: { transform: `translateY(${-y}px)`, margin: "0", position: "relative" },
    filter: (n) => !(n.classList?.contains("fb-tab") || n.classList?.contains("fb-sheet") || n.classList?.contains("fb-back")),
    onCloneNode: (c) => {
      // Копия рисуется заново: без переходов и анимаций, иначе цифры табло встают на ноль.
      const calm = document.createElement("style");
      calm.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
      c.prepend(calm);
      // Цифры табло (js/ui/motion.js): вместо барабана простое число, оно лежит рядом скрытым.
      c.querySelectorAll?.("[data-rolled]").forEach((el) => {
        const num = el.querySelector(".vh");
        if (!num) return;
        el.querySelector(".roll")?.remove();
        num.style.cssText = "";
      });
      const t = c.querySelector?.(".topbar");
      if (t && top) Object.assign(t.style, { position: "relative", zIndex: "10", background: bg, backdropFilter: "none", inset: "auto", transform: `translateY(${shift}px)` });
      const d = c.querySelector?.(".dock");
      if (d && dock) Object.assign(d.style, { position: "absolute", zIndex: "10", top: y + dock.top + "px", bottom: "auto", left: dock.left + "px", right: "auto", width: dock.width + "px", transform: "none" });
    },
  });
}

function open() {
  if (document.querySelector(".fb-sheet")) return;
  const f = facts(); // запомнить сразу: за окном экран может смениться
  const pic = shot().catch((err) => { console.warn(err); return null; });
  let kind = KINDS[0][0];
  let draft = "";
  try { draft = sessionStorage.getItem(DRAFT) || ""; } catch { /* без памяти */ }
  const back = document.createElement("div");
  back.className = "fb-back";
  const box = document.createElement("div");
  box.className = "fb-sheet";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "fb-h");
  box.innerHTML = `<div class="fb-head"><h2 id="fb-h">Замечание по сайту</h2>`
    + `<button class="fb-x" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`
    + `<div class="fb-top"><figure class="fb-shot" aria-live="polite"><span>Снимаем экран…</span></figure>`
    + `<dl class="fb-facts"><dt>Экран</dt><dd>${esc(f.screen)}</dd><dt>Время</dt><dd>${esc(f.time)}</dd><dt>Телефон</dt><dd>${esc(f.device)}</dd></dl></div>`
    + `<div class="fb-kinds" role="radiogroup" aria-label="О чём замечание">`
    + KINDS.map(([k], i) => `<button type="button" role="radio" aria-checked="${i ? "false" : "true"}" data-kind="${esc(k)}">${esc(k)}</button>`).join("") + `</div>`
    + `<textarea class="fb-text" rows="4" maxlength="1500" aria-label="Текст замечания" placeholder="${esc(KINDS[0][1])}"></textarea>`
    + `<button class="btn btn-fire fb-send" type="button" disabled>${ICON_MSG}<span>Отправить в WhatsApp</span></button>`
    + `<p class="fb-note">Снимок экрана, время, экран и телефон добавятся сами. Откроется WhatsApp: выберите чат Хаси Абдуллаха и нажмите «Отправить».</p>`;
  const area = box.querySelector(".fb-text");
  const send = box.querySelector(".fb-send");
  const fig = box.querySelector(".fb-shot");
  area.value = draft;
  const last = document.activeElement;
  const close = () => { back.remove(); box.remove(); document.removeEventListener("keydown", onKey); last?.focus?.(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  back.addEventListener("click", close);
  box.querySelector(".fb-x").addEventListener("click", close);
  area.addEventListener("input", () => { try { sessionStorage.setItem(DRAFT, area.value); } catch { /* без памяти */ } });
  box.querySelector(".fb-kinds").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]");
    if (!b) return;
    kind = b.dataset.kind;
    box.querySelectorAll("[data-kind]").forEach((x) => x.setAttribute("aria-checked", x === b ? "true" : "false"));
    area.placeholder = KINDS.find((k) => k[0] === kind)[1];
  });

  let blob = null;
  pic.then((b) => {
    blob = b;
    fig.innerHTML = b ? `<img src="${URL.createObjectURL(b)}" alt="Снимок экрана для замечания">` : `<span>Снимок не получился. Замечание уйдёт без него.</span>`;
    send.disabled = false;
  });

  send.addEventListener("click", async () => {
    const text = message(kind, area.value, f);
    const file = blob && new File([blob], `xasi-enduro-${f.stamp}.jpg`, { type: blob.type || "image/jpeg" });
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch (err) {
        if (err.name === "AbortError") return; // человек передумал: окно остаётся
        openChat(text, file);
      }
    } else openChat(text, file);
    try { sessionStorage.removeItem(DRAFT); } catch { /* без памяти */ }
    close();
  });

  document.body.append(back, box);
  area.focus({ preventScroll: true });
}

function openChat(text, file) {
  if (file) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.append(a); a.click(); a.remove();
  }
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text + (file ? "\n\n(снимок экрана скачан, прикреплю)" : ""))}`, "_blank", "noopener");
}

/** Кнопка у правого края на каждом экране. */
export function initFeedback() {
  if (document.querySelector(".fb-tab")) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "fb-tab";
  b.setAttribute("aria-label", "Замечание по сайту: ошибка, неточность, идея");
  b.title = "Замечание по сайту";
  b.innerHTML = ICON_MSG;
  b.addEventListener("click", open);
  document.body.append(b);
}
