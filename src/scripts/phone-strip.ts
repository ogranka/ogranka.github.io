// Лента телефонов: вкладки прокручивают ленту, прокрутка подсвечивает вкладку.
// Экран магазина свёрстан на 360 px и масштабируется под ширину рамки, чтобы
// на десктопе четыре телефона помещались в контейнер целиком.
// Фреймы подключаются после загрузки страницы, чтобы не отбирать канал у
// шрифтов и текста кейса: первый сразу, остальные по очереди.
const SCREEN_WIDTH = 360;

export function initPhoneStrip() {
  document.querySelectorAll<HTMLElement>('[data-phones]').forEach((root) => {
    // Скрипт подключают и лента, и одиночный телефон: второй вызов root пропускает
    if (root.dataset.ready) return;
    root.dataset.ready = '';
    const strip = root.querySelector<HTMLElement>('[data-strip]')!;
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const phones = [...strip.querySelectorAll<HTMLElement>('[data-phone]')];
    const frames = phones.map((p) => p.querySelector<HTMLElement>('[data-frame]')!);
    const iframes = phones.map((p) => p.querySelector<HTMLIFrameElement>('iframe')!);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fit = () => {
      frames.forEach((frame) => {
        const inner = frame.clientWidth - 2 * parseFloat(getComputedStyle(frame).paddingLeft);
        frame.style.setProperty('--s', String(inner / SCREEN_WIDTH));
      });
    };
    fit();
    new ResizeObserver(fit).observe(strip);

    const load = (i: number) => {
      const f = iframes[i];
      if (f && f.dataset.src) {
        f.src = f.dataset.src;
        delete f.dataset.src;
      }
    };
    // Первый телефон сразу после загрузки страницы, остальные, когда попадают
    // в экран: на телефоне лента листается вбок, и все четыре копии магазина
    // сразу не нужны. Без IntersectionObserver грузим по очереди, как раньше.
    const loadAll = () => {
      load(0);
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              load(phones.indexOf(e.target as HTMLElement));
              io.unobserve(e.target);
            });
          },
          { rootMargin: '0px 120px' },
        );
        phones.slice(1).forEach((p) => io.observe(p));
        return;
      }
      let k = 1;
      const next = () => {
        if (k < iframes.length) {
          load(k++);
          setTimeout(next, 400);
        }
      };
      setTimeout(next, 600);
    };
    if (document.readyState === 'complete') loadAll();
    else window.addEventListener('load', loadAll, { once: true });

    const select = (i: number) => tabs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));

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
