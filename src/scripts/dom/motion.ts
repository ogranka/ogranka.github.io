// Движение лендинга на GSAP: дом собирается из чертежа по прокрутке первого
// экрана (он закреплён, единственный на странице), линия этапов заполняется
// по прокрутке. При «уменьшить движение» ничего не запускается: в разметке
// уже виден готовый дом и заполненная линия.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Подписи этапов под чертежом: Чертёж, Фундамент, Каркас, Крыша, Свет
const STAGES = [0.04, 0.17, 0.4, 0.66];

export function initMotion() {
  const root = document.documentElement;
  root.classList.add('dom-ready');
  if (!root.classList.contains('dom-anim')) return;

  const track = document.querySelector<HTMLElement>('.hero-track');
  const house = track?.querySelector('.house');
  if (track && house) buildHouse(track, house);
  fillSteps();
}

function buildHouse(track: HTMLElement, house: Element) {
  const layer = (name: string) => house.querySelector(`[data-layer="${name}"]`);
  const stages = [...track.querySelectorAll<HTMLElement>('[data-stage]')];
  let current = -1;
  const setStage = (p: number) => {
    const i = STAGES.filter((s) => p >= s).length;
    if (i === current) return;
    current = i;
    stages.forEach((el, n) => el.classList.toggle('is-on', n === i));
  };
  setStage(0);

  // При открытии чертёж вычерчивается сам, прокрутка дальше строит дом
  const lines = house.querySelectorAll('.lines path');
  gsap.to(lines, { strokeDashoffset: 0, duration: 1.4, stagger: 0.07, ease: 'power1.inOut', delay: 0.2 });
  gsap.to(layer('dims'), { opacity: 1, duration: 0.6, delay: 0.9 });

  // Сборка идёт, пока первый экран прилипает к верху: от начала дорожки
  // до её конца. Длина дорожки задана в CSS, короче на телефоне.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: (self) => setStage(self.progress),
    },
  });
  tl.to(layer('fill-base'), { opacity: 1, duration: 0.4 }, 0.1)
    .fromTo(layer('fill-walls'), { opacity: 0, scaleY: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scaleY: 1, duration: 0.7, ease: 'power2.out' }, 0.45)
    .fromTo(layer('fill-roof'), { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.15)
    .to(layer('fill-glass'), { opacity: 1, duration: 0.4 }, 1.75)
    .fromTo(layer('dims'), { opacity: 1 }, { opacity: 0, duration: 0.4, immediateRender: false }, 1.9)
    .to(layer('light'), { opacity: 1, duration: 0.45 }, 2.2)
    .to(layer('glow'), { opacity: 1, duration: 0.55 }, 2.25)
    .to(layer('pines'), { opacity: 1, duration: 0.6 }, 2.3)
    .to({}, { duration: 0.35 });
}

function fillSteps() {
  const wrap = document.querySelector<HTMLElement>('.steps__wrap');
  if (!wrap) return;
  gsap.to(wrap.querySelector('.steps__fill'), {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: wrap, start: 'top 70%', end: 'bottom 65%', scrub: 0.5 },
  });
  wrap.querySelectorAll<HTMLElement>('.step').forEach((step) => {
    ScrollTrigger.create({ trigger: step, start: 'top 66%', onToggle: (self) => step.classList.toggle('is-on', self.isActive || self.progress === 1), end: 'max' });
  });
}
