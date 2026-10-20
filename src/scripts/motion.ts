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
// первом экране на разную глубину. Смещение догоняет курсор плавно, с
// инерцией: при входе курсора с края и при уходе ничего не прыгает.
function followCursor() {
  const track = (area: HTMLElement, apply: (x: number, y: number) => void) => {
    const move = follower(apply);
    let rect: DOMRect | null = null;
    area.addEventListener('pointerenter', () => (rect = area.getBoundingClientRect()));
    area.addEventListener('pointermove', (e) => {
      rect ??= area.getBoundingClientRect();
      move((e.clientX - rect.left) / rect.width - 0.5, (e.clientY - rect.top) / rect.height - 0.5);
    });
    area.addEventListener('pointerleave', () => {
      rect = null;
      move(0, 0);
    });
  };

  document.querySelectorAll<HTMLElement>('.case-card').forEach((card) => {
    const img = card.querySelector<HTMLElement>('.shot img');
    if (img) track(card, (x, y) => (img.style.translate = x || y ? `${(-x * 16).toFixed(2)}px ${(-y * 16).toFixed(2)}px` : ''));
  });

  const hero = document.querySelector<HTMLElement>('.hero');
  const items = [...document.querySelectorAll<HTMLElement>('.collage__item')];
  const depth = [6, 10, 14];
  if (hero && items.length) {
    track(hero, (x, y) => items.forEach((el, i) => (el.style.translate = x || y ? `${(x * depth[i] * 2).toFixed(2)}px ${(y * depth[i] * 2).toFixed(2)}px` : '')));
  }
}

// Плавное догоняние цели: каждый кадр проходим часть оставшегося пути,
// с поправкой на частоту кадров. Цикл останавливается, когда догнали.
function follower(apply: (x: number, y: number) => void) {
  let cx = 0;
  let cy = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;
  let last = 0;
  const tick = (t: number) => {
    const dt = last ? Math.min(64, t - last) : 16.7;
    last = t;
    const k = 1 - Math.pow(0.9, dt / 16.7);
    cx += (tx - cx) * k;
    cy += (ty - cy) * k;
    if (Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001) {
      cx = tx;
      cy = ty;
      apply(cx, cy);
      raf = 0;
      last = 0;
      return;
    }
    apply(cx, cy);
    raf = requestAnimationFrame(tick);
  };
  return (x: number, y: number) => {
    tx = x;
    ty = y;
    if (!raf) raf = requestAnimationFrame(tick);
  };
}
