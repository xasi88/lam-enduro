// Разделы страницы гонки после итогов: откуда пилоты, команды, трасса, спасибо.
import { esc } from "./format.js?v=1466f04a";
import { plate, pilotHref } from "./parts.js?v=1466f04a";
import { STATUS } from "./format.js?v=1466f04a";

export function villagesOf(d) {
  const m = new Map();
  d.classes.forEach((c) => c.riders.forEach((r) => r.name && r.village && m.set(r.village, (m.get(r.village) || 0) + 1)));
  return m;
}

function geo(d) {
  const all = [...villagesOf(d)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  if (!all.length) return "";
  const top = all.filter(([, n]) => n >= 3), rest = all.filter(([, n]) => n < 3), max = all[0][1];
  const teams = new Map();
  d.classes.forEach((c) => c.riders.forEach((r) => {
    if (!r.team || !r.name) return;
    if (!teams.has(r.team)) teams.set(r.team, []);
    teams.get(r.team).push({ r, c });
  }));
  const teamList = [...teams].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  return `<section class="band band-alt" id="otkuda"><div class="wrap"><h2>Откуда пилоты</h2><div class="geo-grid"><div>`
    + `<p class="muted">Сёл и городов в списках: ${all.length}. Полоса показывает, сколько пилотов приехало из села.</p>`
    + `<div class="geo">` + top.map(([p, n]) => `<div class="geo-row"><span class="geo-name" title="${esc(p)}">${esc(p)}</span>`
      + `<span class="geo-track"><span class="geo-bar" style="width:${(n / max) * 100}%"></span></span><span class="geo-n">${n}</span></div>`).join("") + `</div>`
    + `<div class="chips">` + rest.map(([p, n]) => `<span class="chip">${esc(p)}${n > 1 ? ` <b>${n}</b>` : ""}</span>`).join("") + `</div></div>`
    + (teamList.length ? `<div><h3>Команды</h3><div class="teams">` + teamList.map(([t, rs]) => `<div class="team"><h3>${esc(t)}</h3><ul>`
      + rs.map(({ r, c }) => `<li>${plate(r.n, c.id)}<div class="tm"><a class="r-name" href="${pilotHref(r.name)}">${esc(r.name)}</a>`
        + `<small>${esc(c.name)}${r.place ? `, ${r.place} место` : `, ${STATUS[r.status].short.toLowerCase()}`}</small></div></li>`).join("")
      + `</ul></div>`).join("") + `</div></div>` : "")
    + `</div></div></section>`;
}

function track(d) {
  const t = d.track;
  if (!t) return "";
  return `<section class="band" id="trassa"><div class="wrap"><h2>Трасса</h2><div class="track">`
    + (t.photo ? `<figure><img src="${esc(t.photo.src)}" alt="${esc(t.photo.alt)}" width="480" height="480" loading="lazy"><figcaption>${esc(t.photo.caption)}</figcaption></figure>` : "")
    + `<div><div class="feat">` + t.features.map(([h, p]) => `<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join("") + `</div>`
    + (t.extras ? `<div class="org"><h3>Для пилотов и гостей</h3><ul>${t.extras.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "")
    + `</div></div></div></section>`;
}

function thanks(d) {
  const sp = d.sponsor;
  if (!sp && !d.organizer) return "";
  return `<section class="band band-alt" id="spasibo"><div class="wrap"><h2>Спасибо</h2><div class="thanks">`
    + (sp ? `<article class="th th-main">${sp.logo ? `<img src="${esc(sp.logo)}" alt="Логотип: ${esc(sp.brand)}" width="300" height="300" loading="lazy">` : ""}`
      + `<div class="th-body"><p class="th-role">${esc(sp.role)}</p><p class="th-name">${esc(sp.name)}</p><p>${esc(sp.brand)}. ${esc(sp.thanks || "")}</p></div></article>` : "")
    + (d.organizer ? `<article class="th"><p class="th-role">Организатор</p><p class="th-name">${esc(d.organizer)}</p><p>Спасибо ему и всем, кто помогал. Провести такую гонку непросто.</p></article>` : "")
    + (d.partners ? `<article class="th"><p class="th-role">Партнёры</p>${d.partners.map((p) => `<p>${esc(p)}</p>`).join("")}</article>` : "")
    + `</div><p class="call">Любишь мотоцикл? Приходи на следующую гонку. Там твоё умение увидят и оценят.</p>`
    + (d.poster ? `<figure class="afisha"><img src="${esc(d.poster.src)}" alt="${esc(d.poster.alt)}" width="960" height="680" loading="lazy"><figcaption>Афиша гонки</figcaption></figure>` : "")
    + `</div></section>`;
}

export const moreSections = (d) => geo(d) + track(d) + thanks(d);
