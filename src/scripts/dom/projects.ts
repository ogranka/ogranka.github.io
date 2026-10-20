// Ряд проектов: листается пальцем и колесом нативно, мышью перетаскиванием,
// кнопками на ширину карточки, с клавиатуры стрелками, когда ряд в фокусе.
export function initProjects() {
  const row = document.querySelector<HTMLElement>('.projects__row');
  if (!row) return;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-scroll]')];
  const step = () => (row.querySelector<HTMLElement>('.project')?.offsetWidth ?? 300) + 20;

  const sync = () => {
    // Допуск 8 px: привязка к карточкам оставляет отступ ряда в 4 px
    const max = row.scrollWidth - row.clientWidth - 8;
    buttons.forEach((b) => (b.disabled = Number(b.dataset.scroll) < 0 ? row.scrollLeft <= 8 : row.scrollLeft >= max));
  };
  buttons.forEach((b) => b.addEventListener('click', () => row.scrollBy({ left: Number(b.dataset.scroll) * step(), behavior: 'smooth' })));
  row.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();

  // Перетаскивание мышью; палец и тачпад листают сами
  let startX = 0;
  let startLeft = 0;
  let moved = false;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    startX = e.clientX;
    startLeft = row.scrollLeft;
    moved = false;
    row.setPointerCapture(e.pointerId);
    row.classList.add('is-dragging');
  });
  row.addEventListener('pointermove', (e) => {
    if (!row.classList.contains('is-dragging')) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    row.scrollLeft = startLeft - dx;
  });
  const end = (e: PointerEvent) => {
    if (!row.classList.contains('is-dragging')) return;
    row.releasePointerCapture(e.pointerId);
    // Доводим до ближайшей карточки, как при свайпе. Привязку к карточкам
    // возвращаем после доводки, иначе браузер перехватит её на полпути.
    const s = step();
    // У правого края последняя карточка не кратна шагу: остаёмся у края
    const max = row.scrollWidth - row.clientWidth;
    const target = row.scrollLeft > max - s / 2 ? max : Math.round(row.scrollLeft / s) * s;
    row.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => row.classList.remove('is-dragging'), 450);
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  row.addEventListener('click', (e) => moved && e.preventDefault(), true);
}
