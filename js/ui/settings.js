// Настройки: тема, профиль, что нового, версия.
import { esc } from "./format.js?v=9215d078";
import { THEMES } from "../store.js?v=9215d078";
import { VERSIONS, VERSION } from "../version.js?v=9215d078";

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
    + `<div class="set-group"><h2 class="set-h">Версия ${esc(VERSION)}</h2><a class="link-btn" href="#/new">Что нового</a></div>`
    + `</div></section>`;
}

export function newsView() {
  return `<header class="page-head"><div class="wrap"><a class="back" href="#/settings">Настройки</a><h1>Что нового</h1></div></header><section class="band band-tight"><div class="wrap">`
    + VERSIONS.map((v) => `<h3>Версия ${esc(v.v)} · ${esc(v.date)}</h3><ul class="news">${v.text.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`).join("")
    + `</div></section>`;
}
