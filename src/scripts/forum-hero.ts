// Интерактив концепта форума: уплотнение шапки, появление блоков,
// счётчики, подсветка карточек и перспективное поле частиц на canvas.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const onScroll = (): void => header.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initRiseAnimation(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = Number(el.dataset.d ?? 0);
        setTimeout(() => el.classList.add('on'), reduceMotion ? 0 : delay * 90);
        observer.unobserve(el);
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('.rise').forEach((el) => observer.observe(el));
}

function initCounters(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const target = Number(el.dataset.count);
        observer.unobserve(el);
        if (reduceMotion) {
          el.textContent = target.toLocaleString('ru');
          return;
        }
        const duration = 1500;
        let start = 0;
        const step = (now: number): void => {
          if (!start) start = now;
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased).toLocaleString('ru');
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.5 },
  );
  document.querySelectorAll('[data-count]').forEach((el) => observer.observe(el));
}

function initCardGlow(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });
}

// Поле частиц: перспективная сетка с волной.
function initParticleField(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-field]');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !ctx) return;

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  const gap = 19;
  let points: { x: number; z: number }[] = [];
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  // Палитра корзин считается один раз: ALPHA_STEPS градаций прозрачности
  // на LIFT_STEPS градаций высоты.
  const ALPHA_STEPS = 10;
  const LIFT_STEPS = 4;
  const BUCKET_COUNT = ALPHA_STEPS * LIFT_STEPS;
  const buckets: number[][] = [];
  const bucketColors: string[] = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    buckets[i] = [];
    const lift = ((i % LIFT_STEPS) + 0.5) / LIFT_STEPS;
    const alpha = (Math.floor(i / LIFT_STEPS) + 0.5) / ALPHA_STEPS;
    const r = Math.floor(34 + lift * 34);
    const g = Math.floor(142 + lift * 100);
    const b = Math.floor(178 + lift * 60);
    bucketColors[i] = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }

  function build(): void {
    if (!canvas || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = width < 760;
    cols = narrow ? 70 : 132;
    rows = narrow ? 36 : 62;
    points = [];
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        points.push({ x: (x - cols / 2) * gap, z: z * gap });
      }
    }
  }

  // Сумма синусов даёт «геологические» складки, а не ровную рябь
  function wave(x: number, z: number, t: number): number {
    return (
      Math.sin(x * 0.015 + t * 0.52) * 27 +
      Math.sin(z * 0.023 - t * 0.4) * 21 +
      Math.sin((x + z) * 0.01 + t * 0.28) * 32
    );
  }

  function frame(now: number): void {
    if (!ctx) return;
    const t = now * 0.001;
    mouseX += (targetX - mouseX) * 0.045;
    mouseY += (targetY - mouseY) * 0.045;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#050b1c');
    gradient.addColorStop(0.55, '#071433');
    gradient.addColorStop(1, '#040814');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const focal = 330; // фокусное: меньше — шире охват
    const camY = 128 - mouseY * 34; // подъём камеры
    const camZ = 150; // отступ от сетки
    const cx = width / 2 + mouseX * 50;
    const cy = height * 0.44;

    for (const p of points) {
      const zz = p.z + camZ;
      if (zz < 26) continue;
      const scale = focal / zz;
      const y = wave(p.x, p.z, t);
      const sx = cx + p.x * scale;
      if (sx < -40 || sx > width + 40) continue;
      const sy = cy + (camY - y) * scale;
      if (sy < -40 || sy > height + 40) continue;

      const depth = 1 - zz / (rows * gap + camZ); // 1 близко, 0 далеко
      const alpha = Math.min(Math.pow(depth, 1.55) * 1.25, 1);
      if (alpha < 0.012) continue;
      const size = Math.max(0.6, scale * 1.35);

      // Высокие гребни ярче и холоднее — читается как рельеф
      const lift = Math.min(Math.max((y + 58) / 116, 0), 1);

      // Точки копятся в корзинах по (прозрачность, высота), а рисуются
      // пачками — так fillStyle меняется 40 раз за кадр вместо 8000.
      const alphaIdx = Math.min(Math.floor(alpha * ALPHA_STEPS), ALPHA_STEPS - 1);
      const liftIdx = Math.min(Math.floor(lift * LIFT_STEPS), LIFT_STEPS - 1);
      buckets[alphaIdx * LIFT_STEPS + liftIdx].push(sx - size / 2, sy - size / 2, size);
    }

    for (let i = 0; i < BUCKET_COUNT; i++) {
      const bucket = buckets[i];
      if (!bucket.length) continue;
      ctx.fillStyle = bucketColors[i];
      for (let k = 0; k < bucket.length; k += 3) {
        ctx.fillRect(bucket[k], bucket[k + 1], bucket[k + 2], bucket[k + 2]);
      }
      bucket.length = 0;
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  addEventListener(
    'pointermove',
    (e) => {
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  let resizeTimer: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (reduceMotion) frame(0);
    }, 160);
  });

  build();
  if (reduceMotion) frame(0);
  else requestAnimationFrame(frame);
}

export function initForumHero(): void {
  initHeader();
  initRiseAnimation();
  initCounters();
  initCardGlow();
  initParticleField();
}
