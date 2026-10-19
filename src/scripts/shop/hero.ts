// Слайдер главной: точки и автолистание, пока человек не трогает.
import { $$, must } from './dom';

export function initHero(home: HTMLElement) {
  const track = must('#heroTrack');
  const dots = $$('#heroDots i');
  let idx = 0;
  track.addEventListener(
    'scroll',
    () => {
      idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    },
    { passive: true },
  );
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let auto: number | null = window.setInterval(() => {
    if (document.hidden || home.hidden) return;
    track.scrollTo({ left: ((idx + 1) % dots.length) * track.clientWidth, behavior: 'smooth' });
  }, 4500);
  const stop = () => {
    if (auto) clearInterval(auto);
    auto = null;
  };
  track.addEventListener('pointerdown', stop, { passive: true });
  track.addEventListener('touchstart', stop, { passive: true });
}
