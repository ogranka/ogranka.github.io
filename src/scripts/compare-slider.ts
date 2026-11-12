// Шторка сравнения «было → стало»: перетаскивание указателем,
// стрелки с клавиатуры и лёгкое покачивание-приглашение при загрузке.
// Положение пишется прямо в два элемента: обрезку верхнего макета и сдвиг
// разделителя. Переменная на корне пересчитывала бы стили обоих макетов на
// каждое движение. Без скрипта положение по умолчанию задаёт --x в CSS.

const IDLE_X = 44;
const KEY_STEP = 3;
const KEY_STEP_FAST = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initSlider(root: HTMLElement): void {
  const knob = root.querySelector<HTMLElement>('[data-knob]');
  const before = root.querySelector<HTMLElement>('.pane.before');
  const divider = root.querySelector<HTMLElement>('.divider');
  if (!knob || !before || !divider) return;

  let dragging = false;
  let pct = IDLE_X;
  let width = root.clientWidth;
  divider.style.left = '0';

  const clip = (p: number) => `inset(0 ${(100 - p).toFixed(2)}% 0 0)`;
  const shift = (p: number) => `translateX(${((p / 100) * width).toFixed(1)}px)`;

  const setPosition = (percent: number): void => {
    pct = clamp(percent, 0, 100);
    before.style.clipPath = clip(pct);
    divider.style.transform = shift(pct);
    knob.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  setPosition(pct);

  // Ширина нужна для сдвига в точках: пересчитываем при изменении размера
  new ResizeObserver(() => {
    width = root.clientWidth;
    setPosition(pct);
  }).observe(root);

  const setFromPointer = (clientX: number): void => {
    const rect = root.getBoundingClientRect();
    setPosition(((clientX - rect.left) / rect.width) * 100);
  };

  root.addEventListener('pointerdown', (e) => {
    dragging = true;
    root.setPointerCapture(e.pointerId);
    setFromPointer(e.clientX);
  });
  root.addEventListener('pointermove', (e) => {
    if (dragging) setFromPointer(e.clientX);
  });
  root.addEventListener('pointerup', () => {
    dragging = false;
  });
  root.addEventListener('pointercancel', () => {
    dragging = false;
  });

  knob.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition(pct - step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition(pct + step);
    }
  });

  // Шторка один раз слегка качнётся, показывая, что её можно двигать.
  // Анимация в браузере, а не таймер: не занимает главный поток.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const path = [0, 4, 0, -4, 0, 2, 0].map((d) => IDLE_X + d);
  const timing: KeyframeAnimationOptions = { duration: 900, delay: 400, easing: 'ease-in-out' };
  const wobble = [
    before.animate(path.map((p) => ({ clipPath: clip(p) })), timing),
    divider.animate(path.map((p) => ({ transform: shift(p) })), timing),
  ];
  // Человек сам взялся за шторку мышью или стрелками: покачивание больше не мешает
  const stop = () => wobble.forEach((a) => a.cancel());
  root.addEventListener('pointerdown', stop, { once: true });
  root.addEventListener('keydown', stop, { once: true });
}

export function initCompareSliders(): void {
  document.querySelectorAll<HTMLElement>('[data-compare]').forEach(initSlider);
}
