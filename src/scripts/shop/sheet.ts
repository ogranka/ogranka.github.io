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

  // Шторку смахивают вниз за ручку или шапку: листание переписки и списков
  // внутри её не закрывает. Пока палец на экране, переход выключен и шторка
  // идёт за пальцем без опоздания. Закрывает длинный жест или быстрый короткий,
  // вверх шторка только пружинит на несколько точек.
  let drag: { y0: number; dy: number; lastY: number; lastT: number; speed: number } | null = null;
  const release = () => {
    drag = null;
    sheet.classList.remove('is-dragging');
    sheet.style.transform = '';
  };
  [must('.sheet__grip', sheet), must('.sheet__head', sheet)].forEach((handle) =>
    handle.addEventListener(
      'touchstart',
      (e) => {
        const y = e.touches[0].clientY;
        drag = { y0: y, dy: 0, lastY: y, lastT: e.timeStamp, speed: 0 };
        sheet.classList.add('is-dragging');
      },
      { passive: true },
    ),
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!drag) return;
      const y = e.touches[0].clientY;
      drag.dy = y - drag.y0;
      // Скорость по последнему отрезку, точек в миллисекунду
      drag.speed = (y - drag.lastY) / Math.max(1, e.timeStamp - drag.lastT);
      drag.lastY = y;
      drag.lastT = e.timeStamp;
      const shift = drag.dy > 0 ? drag.dy : -Math.min(24, Math.sqrt(-drag.dy) * 2);
      sheet.style.transform = `translateY(${shift}px)`;
    },
    { passive: true },
  );
  sheet.addEventListener('touchend', () => {
    if (!drag) return;
    const { dy, speed } = drag;
    release();
    if (dy > Math.min(140, sheet.offsetHeight * 0.3) || (dy > 20 && speed > 0.5)) close();
  });
  sheet.addEventListener('touchcancel', () => drag && release());

  return { open, close, body };
}
