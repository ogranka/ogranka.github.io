// Движение на главной: отсчёт цифр в полосе под первым экраном и смещение
// скриншотов за курсором. Нажатия, выезд карточек и сборка первого экрана
// сделаны в CSS. При «уменьшить движение» скрипт ничего не делает: цифры уже
// стоят итоговыми в разметке.
export function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  countUp();
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) followCursor();
}

// Число отсчитывается от нуля за 1,2 с, замедляясь к концу, один раз, когда
// строка цифр видна хотя бы на 40%
function countUp() {
  const nums = [...document.querySelectorAll<HTMLElement>('[data-count]')];
  if (!nums.length || !('IntersectionObserver' in window)) return;
  nums.forEach((el) => (el.textContent = '0'));
  const run = () => {
    const t0 = performance.now();
    const frame = (t: number) => {
      const p = Math.min(1, (t - t0) / 1200);
      const eased = 1 - (1 - p) ** 3;
      nums.forEach((el) => (el.textContent = String(Math.round(Number(el.dataset.count) * eased))));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      run();
    },
    { threshold: 0.4 },
  );
  io.observe(nums[0].closest('ul') ?? nums[0]);
}

// Скриншот в карточке кейса смещается до 8 px за курсором, окна коллажа на
// первом экране на разную глубину. Только translate, один кадр на движение.
function followCursor() {
  const track = (area: HTMLElement, apply: (x: number, y: number) => void) => {
    let rect: DOMRect | null = null;
    let raf = 0;
    let x = 0;
    let y = 0;
    area.addEventListener('pointerenter', () => (rect = area.getBoundingClientRect()));
    area.addEventListener('pointermove', (e) => {
      rect ??= area.getBoundingClientRect();
      x = (e.clientX - rect.left) / rect.width - 0.5;
      y = (e.clientY - rect.top) / rect.height - 0.5;
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), apply(x, y)));
    });
    area.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      raf = 0;
      rect = null;
      apply(0, 0);
    });
  };

  document.querySelectorAll<HTMLElement>('.case-card').forEach((card) => {
    const img = card.querySelector<HTMLElement>('.shot img');
    if (img) track(card, (x, y) => (img.style.translate = x || y ? `${(-x * 16).toFixed(1)}px ${(-y * 16).toFixed(1)}px` : ''));
  });

  const hero = document.querySelector<HTMLElement>('.hero');
  const items = [...document.querySelectorAll<HTMLElement>('.collage__item')];
  const depth = [6, 10, 14];
  if (hero && items.length) {
    track(hero, (x, y) => items.forEach((el, i) => (el.style.translate = x || y ? `${(x * depth[i] * 2).toFixed(1)}px ${(y * depth[i] * 2).toFixed(1)}px` : '')));
  }
}
