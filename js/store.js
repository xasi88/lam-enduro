// Память телефона: закреплённый пилот и тема. Без памяти (закрытый режим) сайт работает, просто не помнит.
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* без памяти */ } };

export const me = {
  get: () => get("lam-me"),
  name: () => get("lam-me-name"),
  set(key, name) { set("lam-me", key); set("lam-me-name", key ? name : null); },
};

// Светлая «Афиша» главная. Тёмную человек включает сам, телефон её не навязывает (2026-11-14).
export const THEMES = [["light", "Светлая"], ["dark", "Тёмная"]];
export const theme = {
  get: () => (get("lam-theme") === "dark" ? "dark" : "light"),
  set(v) {
    set("lam-theme", v === "dark" ? "dark" : null);
    if (v === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  },
};
