// Гонка загрузки: две дорожки проигрывают свои сценарии на requestAnimationFrame.
// Значения — типичные для перегруженной темы и аккуратной вёрстки на медленном 4G.

type StepAction = 'skeleton' | 'fonts' | 'content' | 'banner' | 'cookie' | 'done';

interface Step {
  at: number; // секунда сценария
  mb: number; // всего загружено, МБ
  requests: number;
  status: string;
  action: StepAction | null;
}

const HEAVY_SCRIPT: Step[] = [
  { at: 0.4, mb: 0.3, requests: 6, status: 'Загружается тема…', action: null },
  { at: 1.2, mb: 0.9, requests: 18, status: 'CSS конструктора: 214 КБ…', action: null },
  { at: 2.0, mb: 1.6, requests: 31, status: 'jQuery + три слайдера…', action: 'skeleton' },
  { at: 2.9, mb: 2.2, requests: 44, status: 'Шрифты: 5 семейств…', action: 'fonts' },
  { at: 3.8, mb: 3.1, requests: 58, status: 'Фото 4000×3000 без сжатия…', action: 'content' },
  { at: 4.6, mb: 3.6, requests: 66, status: 'Счётчики, метрики, чат-виджет…', action: 'banner' },
  { at: 5.6, mb: 4.1, requests: 74, status: 'Куки-плашка…', action: 'cookie' },
  { at: 6.4, mb: 4.2, requests: 78, status: 'Готово за 6.4 с', action: 'done' },
];

const LIGHT_SCRIPT: Step[] = [
  { at: 0.3, mb: 0.05, requests: 3, status: 'HTML + один CSS…', action: null },
  { at: 0.7, mb: 0.09, requests: 6, status: 'Один шрифт, картинки по размеру…', action: 'content' },
  { at: 0.9, mb: 0.09, requests: 7, status: 'Готово за 0.9 с', action: 'done' },
];

const VERDICT_HTML =
  'Лёгкая версия была готова, когда тяжёлая ещё не показала ни одной буквы. ' +
  'Разница — <b>в 7 раз по времени и в 46 раз по весу</b>. ' +
  'На телефоне с плохой связью разрыв ещё больше.';

function formatMb(mb: number): string {
  return `${mb.toFixed(1).replace('.', ',')} МБ`;
}

class Lane {
  private readonly mbEl: HTMLElement;
  private readonly requestsEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly blankEl: HTMLElement;
  private readonly demoEl: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly script: Step[],
  ) {
    const query = <T extends HTMLElement>(selector: string): T => {
      const el = root.querySelector<T>(selector);
      if (!el) throw new Error(`Lane element not found: ${selector}`);
      return el;
    };
    this.mbEl = query('[data-stat="mb"]');
    this.requestsEl = query('[data-stat="rq"]');
    this.timeEl = query('[data-stat="time"]');
    this.statusEl = query('[data-status]');
    this.blankEl = query('[data-blank]');
    this.demoEl = query('[data-demo]');
  }

  reset(): void {
    this.mbEl.textContent = '0,0 МБ';
    this.requestsEl.textContent = '0';
    this.timeEl.textContent = '0.0 с';
    this.statusEl.textContent = 'Ожидание старта';
    this.statusEl.classList.remove('done');
    this.demoEl.style.display = 'none';
    this.blankEl.style.display = 'flex';
    this.blankEl.innerHTML = '<div class="spinner"></div>';
    this.banner()?.style.setProperty('display', 'none');
    this.cookie()?.style.setProperty('display', 'none');
    this.ghosts().forEach((el) => el.classList.remove('ghost'));
  }

  play(onDone: () => void): void {
    let index = 0;
    let start: number | null = null;

    const tick = (now: number): void => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      this.timeEl.textContent = `${elapsed.toFixed(1)} с`;

      while (index < this.script.length && elapsed >= this.script[index].at) {
        this.applyStep(this.script[index]);
        index += 1;
      }
      if (index < this.script.length) requestAnimationFrame(tick);
      else onDone();
    };
    requestAnimationFrame(tick);
  }

  // Мгновенно показать финальное состояние (prefers-reduced-motion и режим ?final).
  finishInstantly(): void {
    this.script.forEach((step) => this.applyStep(step));
    this.ghosts().forEach((el) => el.classList.remove('ghost'));
  }

  private applyStep(step: Step): void {
    this.mbEl.textContent = formatMb(step.mb);
    this.requestsEl.textContent = String(step.requests);
    this.statusEl.textContent = step.status;
    if (step.action) this.act(step.action);
  }

  private act(action: StepAction): void {
    switch (action) {
      case 'skeleton':
        this.showDemo();
        this.ghosts().forEach((el) => el.classList.add('ghost'));
        break;
      case 'fonts':
        this.unghost('fonts');
        break;
      case 'content':
        this.showDemo();
        this.unghost('content');
        break;
      case 'banner': {
        const banner = this.banner();
        if (banner) {
          banner.style.display = 'block';
          banner.classList.add('flash');
        }
        break;
      }
      case 'cookie':
        this.cookie()?.style.setProperty('display', 'flex');
        break;
      case 'done': {
        this.statusEl.classList.add('done');
        const finishedAt = this.script[this.script.length - 1].at;
        this.timeEl.textContent = `${finishedAt.toFixed(1)} с`;
        break;
      }
    }
  }

  private showDemo(): void {
    this.blankEl.style.display = 'none';
    this.demoEl.style.display = 'flex';
  }

  private unghost(group: string): void {
    this.root
      .querySelectorAll(`[data-ghost="${group}"]`)
      .forEach((el) => el.classList.remove('ghost'));
  }

  private ghosts(): NodeListOf<HTMLElement> {
    return this.root.querySelectorAll<HTMLElement>('[data-ghost]');
  }

  private banner(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('[data-banner]');
  }

  private cookie(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('[data-cookie]');
  }
}

export function initSpeedRace(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-race-start]');
  const verdictEl = document.querySelector<HTMLElement>('[data-verdict]');
  const heavyRoot = document.querySelector<HTMLElement>('[data-lane="heavy"]');
  const lightRoot = document.querySelector<HTMLElement>('[data-lane="light"]');
  if (!button || !verdictEl || !heavyRoot || !lightRoot) return;

  const heavy = new Lane(heavyRoot, HEAVY_SCRIPT);
  const light = new Lane(lightRoot, LIGHT_SCRIPT);
  const lanes = [heavy, light];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;

  const finale = (): void => {
    running = false;
    button.disabled = false;
    button.textContent = '↻ Повторить гонку';
    verdictEl.innerHTML = VERDICT_HTML;
  };

  const finishInstantly = (): void => {
    lanes.forEach((lane) => {
      lane.reset();
      lane.finishInstantly();
    });
    finale();
  };

  const start = (): void => {
    if (running) return;
    running = true;
    lanes.forEach((lane) => lane.reset());
    verdictEl.textContent = '';
    button.disabled = true;
    button.textContent = 'Гонка идёт…';
    if (reduceMotion) {
      finishInstantly();
      return;
    }
    let finished = 0;
    const onLaneDone = (): void => {
      finished += 1;
      if (finished === lanes.length) finale();
    };
    lanes.forEach((lane) => lane.play(onLaneDone));
  };

  button.addEventListener('click', start);

  // Служебные режимы для скриншотов: ?final — сразу финал, ?auto — автозапуск.
  if (location.search.includes('final')) {
    addEventListener('load', finishInstantly);
  } else if (location.search.includes('auto')) {
    addEventListener('load', () => setTimeout(start, 600));
  }
}
