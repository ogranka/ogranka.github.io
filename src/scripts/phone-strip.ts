// Лента телефонов: вкладки прокручивают ленту, прокрутка подсвечивает вкладку.
// Фреймы с магазином подключаются после загрузки страницы, чтобы не
// отбирать канал у шрифтов и текста кейса: первый сразу, остальные по очереди.
export function initPhoneStrip() {
  document.querySelectorAll<HTMLElement>('[data-phones]').forEach((root) => {
    const strip = root.querySelector<HTMLElement>('[data-strip]')!;
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const phones = [...strip.querySelectorAll<HTMLElement>('[data-phone]')];
    const frames = phones.map((p) => p.querySelector<HTMLIFrameElement>('iframe')!);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const load = (i: number) => {
      const f = frames[i];
      if (f && f.dataset.src) {
        f.src = f.dataset.src;
        delete f.dataset.src;
      }
    };
    const loadAll = () => {
      load(0);
      let k = 1;
      const next = () => {
        if (k < frames.length) {
          load(k++);
          setTimeout(next, 400);
        }
      };
      setTimeout(next, 600);
    };
    if (document.readyState === 'complete') loadAll();
    else window.addEventListener('load', loadAll, { once: true });

    const select = (i: number) => tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        select(i);
        load(i);
        const target = phones[i];
        strip.scrollTo({ left: target.offsetLeft - strip.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    let raf = 0;
    strip.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const x = strip.scrollLeft + strip.clientWidth * 0.25;
          let i = 0;
          phones.forEach((p, k) => {
            if (p.offsetLeft - strip.offsetLeft <= x) i = k;
          });
          select(i);
        });
      },
      { passive: true },
    );
  });
}
