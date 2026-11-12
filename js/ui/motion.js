// Движение на экранах, идеи с designbookmark.com/motion (выбор автора 2026-11-12):
// подложка классов переезжает (Segmented control), цифры табло прокручиваются (Word roll).
// Плавное раскрытие групп и рост столбиков: только CSS, файл css/motion.css.
// «Уменьшить движение» в системе: ничего не двигается.

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const pills = new Map(); // раздел адреса → где стояла подложка в прошлый раз
let refit = null; // поставить подложку заново, когда меняется ширина экрана (поворот планшета)
addEventListener("resize", () => refit?.());

/** Подложка выбранного класса: появляется там, где была, и переезжает к новому классу. */
function classPill(root) {
  const nav = root.querySelector(".classes");
  const cur = nav?.querySelector("[aria-current]");
  if (!cur) return;
  const page = location.hash.split("/")[1] || "";
  const pill = document.createElement("span");
  pill.className = "cls-pill";
  pill.setAttribute("aria-hidden", "true");
  nav.prepend(pill);
  nav.classList.add("has-pill");
  const to = { x: cur.offsetLeft, y: cur.offsetTop, c: getComputedStyle(cur).getPropertyValue("--pc").trim() };
  const put = (p) => { pill.style.transform = `translate(${p.x}px,${p.y}px)`; pill.style.background = p.c; };
  pill.style.width = cur.offsetWidth + "px";
  pill.style.height = cur.offsetHeight + "px";
  const from = pills.get(page);
  pills.set(page, to);
  refit = () => {
    if (!pill.isConnected) return;
    pill.classList.remove("go");
    pill.style.width = cur.offsetWidth + "px";
    pill.style.height = cur.offsetHeight + "px";
    const now = { x: cur.offsetLeft, y: cur.offsetTop, c: to.c };
    pills.set(page, now);
    put(now);
  };
  if (!from || calm() || (from.x === to.x && from.y === to.y)) { put(to); return; }
  put(from);
  pill.getBoundingClientRect();
  pill.classList.add("go");
  put(to);
}

/** Цифры табло: каждая цифра крутится от 0 до своего значения. Число для чтения экраном остаётся. */
function rollNumbers(root) {
  if (calm()) return;
  root.querySelectorAll("[data-roll]").forEach((el, i) => {
    const v = el.textContent.trim();
    if (!/^\d+$/.test(v) || el.dataset.rolled) return;
    el.dataset.rolled = "1";
    el.textContent = "";
    const said = document.createElement("span");
    said.className = "vh";
    said.textContent = v;
    const box = document.createElement("span");
    box.className = "roll";
    box.setAttribute("aria-hidden", "true");
    const cols = [...v].map((d, k) => {
      const col = document.createElement("span");
      col.className = "roll-col";
      col.innerHTML = "<i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i>";
      col.style.transitionDuration = `${0.7 + k * 0.15}s`;
      col.style.transitionDelay = `${Math.min(i, 12) * 0.03}s`;
      box.append(col);
      return [col, d];
    });
    el.append(said, box);
    box.getBoundingClientRect();
    cols.forEach(([col, d]) => { col.style.transform = `translateY(-${d * 10}%)`; });
  });
}

/** Запускать после каждой смены экрана. */
export function motion(root) {
  classPill(root);
  rollNumbers(root);
}

/** Следить за #app: экран сменился, движение запускается само. */
export function watchMotion(root) {
  new MutationObserver(() => motion(root)).observe(root, { childList: true });
}
