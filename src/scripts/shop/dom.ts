// Мелкие помощники для DOM магазина.

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

// Обязательный элемент разметки: если его нет, ошибка сразу говорит какой,
// а не падает дальше на чтении свойства у null
export function must<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Магазин: в разметке нет ${sel}`);
  return el;
}

export function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}

export const bouquets = (n: number) => `${n} ${plural(n, ['букет', 'букета', 'букетов'])}`;

// Всплывашка внизу экрана
export function createToast(el: HTMLElement) {
  let timer = 0;
  return (msg: string) => {
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('show'), 1800);
  };
}
