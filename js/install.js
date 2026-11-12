// Установка сайта как приложения: офлайн-работа и кнопка «Установить» в настройках.
// Android и компьютер: браузер присылает событие beforeinstallprompt, кнопка вызывает окно установки.
// iPhone: такого события нет, в настройках подсказка «Поделиться → На экран „Домой“».
let prompt = null;
const listeners = new Set();

export const install = {
  /** "installed", "ready" (можно показать кнопку), "ios" (подсказка) или "manual". */
  state() {
    if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "installed";
    if (prompt) return "ready";
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
    return "manual";
  },
  async run() {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    prompt = null;
    listeners.forEach((f) => f());
    return outcome === "accepted";
  },
  onChange(f) { listeners.add(f); },
};

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { /* без офлайна сайт работает */ }));
}
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); prompt = e; listeners.forEach((f) => f()); });
addEventListener("appinstalled", () => { prompt = null; listeners.forEach((f) => f()); });
