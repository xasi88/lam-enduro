// Память телефона: закреплённый пилот и тема. Без памяти (закрытый режим) сайт работает, просто не помнит.
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* без памяти */ } };

export const me = {
  get: () => get("lam-me"),
  name: () => get("lam-me-name"),
  set(key, name) { set("lam-me", key); set("lam-me-name", key ? name : null); },
};

export const THEMES = [["auto", "Как на телефоне"], ["dark", "Тёмная"], ["light", "Светлая"]];
export const theme = {
  get: () => get("lam-theme") || "auto",
  set(v) {
    set("lam-theme", v === "auto" ? null : v);
    if (v === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", v);
  },
};
