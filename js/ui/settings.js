// Настройки: тема, профиль, что нового, версия.
import { esc } from "./format.js?v=8c47f740";
import { THEMES } from "../store.js?v=8c47f740";
import { VERSIONS, VERSION } from "../version.js?v=8c47f740";
import { install } from "../install.js?v=8c47f740";

export function settingsView(themeNow, meName) {
  return `<header class="page-head"><div class="wrap"><h1>Настройки</h1></div></header>`
    + `<section class="band band-tight"><div class="wrap set-list">`
    + `<div class="set-group"><h2 class="set-h">Тема</h2><div class="seg" role="radiogroup" aria-label="Тема">`
    + THEMES.map(([v, label]) => `<button type="button" role="radio" class="pill" data-theme-set="${v}" aria-checked="${v === themeNow}">${label}</button>`).join("")
    + `</div></div>`
    + `<div class="set-group"><h2 class="set-h">Профиль</h2>`
    + (meName ? `<p>Закреплён: <b>${esc(meName)}</b></p><div class="cta"><a class="btn btn-ghost" href="#/me">Открыть</a><button class="btn btn-ghost" type="button" data-unpin>Открепить</button></div>`
      : `<p class="muted">Профиль не закреплён.</p><div class="cta"><a class="btn btn-ghost" href="#/me">Найти себя</a></div>`)
    + `</div>`
    + `<div class="set-group"><h2 class="set-h">Регламент</h2><p class="muted">Классы, места, очки, штрафы, сход.</p><div class="cta"><a class="btn btn-ghost" href="#/rules">Открыть регламент</a></div></div>`
    + appGroup()
    + `<div class="set-group"><h2 class="set-h">Версия ${esc(VERSION)}</h2><a class="link-btn" href="#/new">Что нового</a></div>`
    + `</div></section>`;
}

export function newsView() {
  return `<header class="page-head"><div class="wrap"><a class="back" href="#/settings">Настройки</a><h1>Что нового</h1></div></header><section class="band band-tight"><div class="wrap">`
    + VERSIONS.map((v) => `<h3>Версия ${esc(v.v)} · ${esc(v.date)}</h3><ul class="news">${v.text.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`).join("")
    + `</div></section>`;
}

/** Приложение: кнопка установки или подсказка, как поставить. */
function appGroup() {
  const st = install.state();
  const body = {
    installed: `<p>Приложение уже стоит на этом телефоне.</p>`,
    ready: `<p class="muted">Значок на экране телефона, открывается без браузера, работает без сети с последними данными.</p>`
      + `<div class="cta"><button class="btn btn-fire" type="button" data-install>Установить приложение</button></div>`,
    ios: `<p class="muted">На iPhone в Safari:</p><ol class="news"><li>Нажмите «Поделиться» внизу экрана.</li><li>Выберите «На экран „Домой“».</li><li>Нажмите «Добавить».</li></ol>`,
    manual: `<p class="muted">Откройте сайт в Chrome. Нажмите меню ⋮ и выберите «Установить приложение» или «Добавить на главный экран».</p>`,
  }[st];
  return `<div class="set-group"><h2 class="set-h">Приложение</h2>${body}</div>`;
}

export function bindSettings(root) {
  root.querySelector("[data-install]")?.addEventListener("click", () => install.run());
}
