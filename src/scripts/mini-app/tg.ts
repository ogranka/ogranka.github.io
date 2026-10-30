// Связка с Telegram. Внутри Telegram пользуемся его нижней кнопкой, кнопкой
// «назад», вибрацией и диалогами. В обычном браузере (страница кейса, прямая
// ссылка) то же самое рисует само приложение, логика экранов одна.

/* eslint-disable @typescript-eslint/no-explicit-any */
type WebApp = any;

export type Haptic = 'select' | 'tap' | 'success' | 'error';

export interface MainButton {
  text: string;
  onClick: () => void;
  progress?: boolean;
}

export interface Shell {
  inTelegram: boolean;
  userName: string;
  initData: string;
  setMain(btn: MainButton | null): void;
  setBack(onClick: (() => void) | null): void;
  haptic(kind: Haptic): void;
  confirm(text: string): Promise<boolean>;
  done(): void;
}

const SDK = 'https://telegram.org/js/telegram-web-app.js';

// Telegram передаёт данные запуска в адресе после #, по ним понимаем, что мы
// внутри Telegram, ещё до загрузки его скрипта. В браузере скрипт не грузим.
const launchedFromTelegram = () => /tgWebAppData=|tgWebAppPlatform=/.test(location.hash) || !!sessionStorageGet('__telegram__initParams');

function sessionStorageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadSdk(): Promise<WebApp | null> {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SDK;
    s.onload = () => resolve((window as any).Telegram?.WebApp ?? null);
    s.onerror = () => resolve(null);
    setTimeout(() => resolve((window as any).Telegram?.WebApp ?? null), 6000);
    document.head.append(s);
  });
}

export async function createShell(mainEl: HTMLButtonElement, backEl: HTMLButtonElement): Promise<Shell> {
  const wa: WebApp | null = launchedFromTelegram() ? await loadSdk() : null;
  return wa && wa.initData ? telegramShell(wa) : browserShell(mainEl, backEl);
}

function telegramShell(wa: WebApp): Shell {
  document.documentElement.classList.add('in-tg');
  wa.ready();
  wa.expand();
  try {
    wa.setHeaderColor('secondary_bg_color');
    wa.setBackgroundColor('secondary_bg_color');
  } catch {}
  let mainHandler: (() => void) | null = null;
  let backHandler: (() => void) | null = null;
  wa.MainButton.onClick(() => mainHandler?.());
  wa.BackButton.onClick(() => backHandler?.());
  return {
    inTelegram: true,
    userName: wa.initDataUnsafe?.user?.first_name ?? '',
    initData: wa.initData,
    setMain(btn) {
      mainHandler = btn?.onClick ?? null;
      if (!btn) {
        wa.MainButton.hideProgress();
        wa.MainButton.hide();
        return;
      }
      wa.MainButton.setParams({ text: btn.text, is_visible: true, is_active: !btn.progress });
      if (btn.progress) wa.MainButton.showProgress(false);
      else wa.MainButton.hideProgress();
    },
    setBack(onClick) {
      backHandler = onClick;
      if (onClick) wa.BackButton.show();
      else wa.BackButton.hide();
    },
    haptic(kind) {
      const h = wa.HapticFeedback;
      if (!h) return;
      if (kind === 'select') h.selectionChanged();
      else if (kind === 'tap') h.impactOccurred('light');
      else h.notificationOccurred(kind);
    },
    confirm(text) {
      return new Promise((resolve) => wa.showConfirm(text, (ok: boolean) => resolve(ok)));
    },
    done() {
      wa.close();
    },
  };
}

function browserShell(mainEl: HTMLButtonElement, backEl: HTMLButtonElement): Shell {
  let mainHandler: (() => void) | null = null;
  let backHandler: (() => void) | null = null;
  mainEl.addEventListener('click', () => mainHandler?.());
  backEl.addEventListener('click', () => backHandler?.());
  return {
    inTelegram: false,
    userName: '',
    initData: '',
    setMain(btn) {
      mainHandler = btn?.onClick ?? null;
      const bar = mainEl.parentElement!;
      bar.hidden = !btn;
      if (!btn) return;
      mainEl.textContent = btn.text;
      mainEl.disabled = !!btn.progress;
      mainEl.classList.toggle('is-busy', !!btn.progress);
    },
    setBack(onClick) {
      backHandler = onClick;
      backEl.hidden = !onClick;
    },
    haptic(kind) {
      // На телефоне в браузере короткая вибрация там, где её поддерживают
      if (kind === 'success') navigator.vibrate?.(30);
    },
    confirm(text) {
      return confirmDialog(text);
    },
    done() {},
  };
}

// Свой диалог вместо window.confirm: тот блокирует страницу и выглядит чужим
function confirmDialog(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'ask';
    d.innerHTML = `<p></p><div class="ask__actions"><button type="button" value="no">Оставить</button><button type="button" value="yes" class="danger">Отменить</button></div>`;
    d.querySelector('p')!.textContent = text;
    const close = (ok: boolean) => {
      d.close();
      d.remove();
      resolve(ok);
    };
    d.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (b) close(b.value === 'yes');
      else if (e.target === d) close(false);
    });
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(false);
    });
    document.body.append(d);
    d.showModal();
    (d.querySelector('button[value=no]') as HTMLButtonElement).focus();
  });
}
