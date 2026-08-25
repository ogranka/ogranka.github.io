// Шторка сравнения «было → стало»: перетаскивание указателем,
// стрелки с клавиатуры и лёгкое покачивание-приглашение при загрузке.

const IDLE_X = 44;
const KEY_STEP = 3;
const KEY_STEP_FAST = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initSlider(root: HTMLElement): void {
  const knob = root.querySelector<HTMLElement>('[data-knob]');
  if (!knob) return;

  let dragging = false;

  const setPosition = (percent: number): void => {
    const pct = clamp(percent, 0, 100);
    root.style.setProperty('--x', `${pct.toFixed(2)}%`);
    knob.setAttribute('aria-valuenow', String(Math.round(pct)));
  };

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
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--x')) || 50;
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition(current - step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition(current + step);
    }
  });

  startIdleWobble(root);
}

// Шторка один раз слегка качнётся, показывая, что её можно двигать.
function startIdleWobble(root: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    root.style.setProperty('--x', `${IDLE_X + Math.sin(tick / 8) * 4}%`);
    if (tick > 48) {
      clearInterval(timer);
      root.style.setProperty('--x', `${IDLE_X}%`);
    }
  }, 16);
  root.addEventListener('pointerdown', () => clearInterval(timer), { once: true });
}

export function initCompareSliders(): void {
  document.querySelectorAll<HTMLElement>('[data-compare]').forEach(initSlider);
}
