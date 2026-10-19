// Шторка снизу: одна на все случаи (фильтр, корзина, чат и др.). Чем её
// наполнить, решает тот, кто открывает: fill кладёт содержимое в тело и может
// вернуть уборку, которую шторка вызовет при закрытии или смене содержимого.
import { $, must } from './dom';

export type SheetKind = 'filter' | 'sort' | 'card' | 'ribbon' | 'search' | 'chat' | 'cart' | 'florist';

const TITLES: Record<SheetKind, string> = {
  filter: 'Фильтр',
  sort: 'Сортировка',
  card: 'Открытка',
  ribbon: 'Лента',
  search: 'Поиск',
  chat: 'Консультант',
  cart: 'Корзина',
  florist: 'Флорист на связи',
};

interface SheetOptions {
  // Экран и плавающий блок: пока шторка открыта, они недоступны с клавиатуры
  background: HTMLElement[];
  fill: (kind: SheetKind, body: HTMLElement) => (() => void) | void;
  // Не переводить фокус внутрь шторки (чат во фрейме кейса не должен красть фокус страницы)
  keepFocus?: (kind: SheetKind) => boolean;
}

export function initSheet({ background, fill, keepFocus }: SheetOptions) {
  const sheet = must('#sheet');
  const scrim = must('#scrim');
  const body = must('#sheetBody');
  let lastFocus: HTMLElement | null = null;
  let closeTimer = 0;
  let cleanup: (() => void) | void;

  const open = (kind: SheetKind) => {
    clearTimeout(closeTimer);
    // При переходе из одной шторки в другую фокус после закрытия вернётся
    // туда, откуда открыли первую
    if ((sheet.hidden || !sheet.classList.contains('show')) && !sheet.contains(document.activeElement)) {
      lastFocus = document.activeElement as HTMLElement;
    }
    cleanup?.();
    must('#sheetTitle').textContent = TITLES[kind];
    body.innerHTML = '';
    sheet.classList.toggle('sheet--chat', kind === 'chat');
    cleanup = fill(kind, body);
    sheet.hidden = scrim.hidden = false;
    background.forEach((el) => (el.inert = true));
    requestAnimationFrame(() => {
      sheet.classList.add('show');
      scrim.classList.add('show');
    });
    if (!keepFocus?.(kind)) {
      const field = $('input, textarea', body);
      setTimeout(() => (field && kind !== 'filter' ? field : must('[data-close]', sheet)).focus({ preventScroll: true }), 50);
    }
    document.documentElement.style.overflow = 'hidden';
  };

  const close = () => {
    cleanup?.();
    cleanup = undefined;
    sheet.classList.remove('show');
    scrim.classList.remove('show');
    background.forEach((el) => (el.inert = false));
    document.documentElement.style.overflow = '';
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      sheet.hidden = scrim.hidden = true;
    }, 340);
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  };

  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) close();
  });

  // Шторку можно смахнуть вниз
  let y0: number | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (body.scrollTop <= 0) y0 = e.touches[0].clientY;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    },
    { passive: true },
  );
  sheet.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.style.transform = '';
    y0 = null;
    if (dy > 90) close();
  });

  return { open, close, body };
}
