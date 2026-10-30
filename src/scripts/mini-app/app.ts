// Мини-приложение записи в барбершоп «313»: услуга, мастер, день и время,
// проверка, готово. Экраны рисуются строками, события ловятся делегированием
// по data-act. Нижняя кнопка и «назад» идут через Shell: в Telegram это его
// родные кнопки, в браузере свои.
import {
  ANY,
  bookingDays,
  dayNum,
  doesService,
  fmtDay,
  fmtDayShort,
  fmtDur,
  fmtPrice,
  fmtTime,
  masterById,
  masters,
  mskNow,
  nearest,
  priceFor,
  serviceById,
  services,
  slotsFor,
  wd,
  weekday,
  type Booking,
  type Slot,
} from './core';
import { localApi, serverApi, type Api } from './api';
import { createShell, type Shell } from './tg';

type Screen = 'home' | 'master' | 'time' | 'confirm' | 'done' | 'mine';

interface State {
  screen: Screen;
  service: string;
  master: string;
  date: string;
  start: number | null;
  last: Booking | null;
  mine: Booking[];
  busy: boolean;
}

const root = document.getElementById('app')!;
const titleEl = document.getElementById('title')!;
const stepEl = document.getElementById('step')!;
const backEl = document.getElementById('back') as HTMLButtonElement;
const mainEl = document.getElementById('main-btn') as HTMLButtonElement;
const toastEl = document.getElementById('toast')!;

const s: State = { screen: 'home', service: '', master: ANY, date: '', start: null, last: null, mine: [], busy: false };
let shell: Shell;
let api: Api;

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const chevron = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// Страница кейса держит рядом «чат с ботом»: сообщаем ей о записях
const embedded = window.parent !== window;
function tellHost(type: 'booked' | 'cancelled', b: Booking) {
  if (!embedded || shell.inTelegram) return;
  window.parent.postMessage({ source: 'barber313', type, booking: describe(b) }, location.origin);
}

export function describe(b: Booking) {
  const now = mskNow();
  return {
    id: b.id,
    service: serviceById(b.service)?.name ?? '',
    master: masterById(b.master)?.name ?? '',
    when: `${fmtDay(b.date, now)}, ${fmtTime(b.start)}`,
    time: fmtTime(b.start),
    price: fmtPrice(b.price),
  };
}

function avatar(id: string) {
  const m = masterById(id);
  if (!m) return '<span class="ava ava--any" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.6"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.6 15.2c2.6-.4 4.9.8 5.6 3.8"/></svg></span>';
  return `<span class="ava" style="--c:${m.color}" aria-hidden="true">${m.name[0]}</span>`;
}

function nearestLabel(serviceId: string, masterId: string) {
  const n = nearest(serviceId, masterId, api.busy(), mskNow());
  return n ? `Ближайшее: ${fmtDayShort(n.date, mskNow())} в ${fmtTime(n.start)}` : 'Свободного времени на две недели нет';
}

// Экраны
const views: Record<Screen, () => string> = {
  home() {
    const groups = [...new Set(services.map((x) => x.group))];
    const hello = shell.userName ? `${esc(shell.userName)}, выберите` : 'Выберите';
    return `
      <section class="brand" aria-label="Барбершоп 313">
        <div class="brand__mark"><b>313</b><span>барбершоп</span></div>
        <p>Санкт-Петербург, ежедневно с&nbsp;10 до&nbsp;22</p>
      </section>
      <p class="lead">${hello} услугу, потом мастера и время. Запись займёт минуту.</p>
      ${
        s.mine.length
          ? `<button class="row row--card" data-act="mine"><span class="row__main"><b>Мои записи</b><small>${esc(describe(s.mine[0]).when)}, ${esc(describe(s.mine[0]).service)}</small></span><span class="badge">${s.mine.length}</span>${chevron}</button>`
          : ''
      }
      ${groups
        .map(
          (g) => `
        <h2 class="sect">${g}</h2>
        <ul class="list">
          ${services
            .filter((x) => x.group === g)
            .map(
              (x) => `<li><button class="row" data-act="service" data-id="${x.id}">
                <span class="row__main"><b>${x.name}</b><small>${fmtDur(x.dur)} · ${x.note}</small></span>
                <span class="row__side">от&nbsp;${fmtPrice(x.price)}</span>${chevron}</button></li>`,
            )
            .join('')}
        </ul>`,
        )
        .join('')}
      <p class="foot">Цены у топ-барбера на 400&nbsp;₽ выше. Отменить запись можно в «Моих записях» или в чате с ботом.</p>`;
  },

  master() {
    const sv = serviceById(s.service)!;
    const pool = masters.filter((m) => doesService(m, sv.id));
    const skipped = masters.filter((m) => !doesService(m, sv.id));
    return `
      <ul class="list">
        <li><button class="row" data-act="master" data-id="${ANY}">${avatar(ANY)}
          <span class="row__main"><b>Любой мастер</b><small>${nearestLabel(sv.id, ANY)}</small></span>
          <span class="row__side">${fmtPrice(sv.price)}</span>${chevron}</button></li>
      </ul>
      <h2 class="sect">Мастера</h2>
      <ul class="list">
        ${pool
          .map(
            (m) => `<li><button class="row" data-act="master" data-id="${m.id}">${avatar(m.id)}
            <span class="row__main"><b>${m.name}</b><small>${m.level}, ${m.years} ${plural(m.years, 'год', 'года', 'лет')} опыта</small><small>${nearestLabel(sv.id, m.id)}</small></span>
            <span class="row__side">${fmtPrice(priceFor(sv.id, m.id))}</span>${chevron}</button></li>`,
          )
          .join('')}
      </ul>
      ${skipped.length ? `<p class="foot">${sv.name}: ${skipped.map((m) => m.name).join(', ')} эту услугу не делает.</p>` : ''}`;
  },

  time() {
    const now = mskNow();
    const busy = api.busy();
    const days = bookingDays(now).map((d) => ({ d, n: slotsFor(d, s.service, s.master, busy, now).length }));
    const slots = slotsFor(s.date, s.service, s.master, busy, now);
    const parts: [string, (t: number) => boolean][] = [
      ['Утро', (t) => t < 12 * 60],
      ['День', (t) => t >= 12 * 60 && t < 17 * 60],
      ['Вечер', (t) => t >= 17 * 60],
    ];
    const near = slots.length ? null : nearest(s.service, s.master, busy, now);
    const m = masterById(s.master);
    const dayOff = m && m.off.includes(weekday(s.date)) ? m.name : '';
    return `
      <div class="days" role="radiogroup" aria-label="День">
        ${days
          .map(
            ({ d, n }) => `<button class="day${d === s.date ? ' is-on' : ''}" role="radio" aria-checked="${d === s.date}" data-act="day" data-id="${d}"
              ${n ? '' : 'data-empty'} aria-label="${fmtDay(d, now)}, ${n ? `свободно ${n} ${plural(n, 'окно', 'окна', 'окон')}` : 'свободного времени нет'}">
              <small>${d === now.date ? 'сег' : wd(d)}</small><b>${dayNum(d)}</b></button>`,
          )
          .join('')}
      </div>
      <h2 class="sect sect--day">${cap(fmtDay(s.date, now))}</h2>
      ${
        slots.length
          ? parts
              .map(([label, test]) => {
                const list = slots.filter((x: Slot) => test(x.start));
                if (!list.length) return '';
                return `<div class="slots-group"><h3>${label}</h3><div class="slots" role="radiogroup" aria-label="${label}">
                  ${list
                    .map(
                      (x) => `<button class="slot${x.start === s.start ? ' is-on' : ''}" role="radio" aria-checked="${x.start === s.start}" data-act="slot" data-id="${x.start}">${fmtTime(x.start)}</button>`,
                    )
                    .join('')}
                </div></div>`;
              })
              .join('')
          : `<div class="empty"><p>${dayOff ? `У мастера ${dayOff} выходной.` : 'На этот день свободного времени нет.'}</p>
              ${near ? `<button class="link" data-act="jump" data-id="${near.date}|${near.start}">Ближайшее: ${fmtDayShort(near.date, now)} в ${fmtTime(near.start)}</button>` : ''}</div>`
      }`;
  },

  confirm() {
    const now = mskNow();
    const sv = serviceById(s.service)!;
    const price = priceFor(sv.id, s.master);
    return `
      <ul class="list list--info">
        <li class="info"><span>Услуга</span><b>${sv.name}</b></li>
        <li class="info"><span>Мастер</span><b>${s.master === ANY ? 'Любой свободный' : masterById(s.master)!.name}</b></li>
        <li class="info"><span>Когда</span><b>${cap(fmtDay(s.date, now))}, ${fmtTime(s.start!)}</b></li>
        <li class="info"><span>Длительность</span><b>${fmtDur(sv.dur)}</b></li>
        <li class="info"><span>Где</span><b>Санкт-Петербург, 3 минуты от метро</b></li>
        <li class="info info--total"><span>К оплате на месте</span><b>${fmtPrice(price)}</b></li>
      </ul>
      <p class="foot">${
        shell.inTelegram
          ? `Запись на имя ${esc(shell.userName) || 'из Telegram'}. Подтверждение и напоминание придут в этот чат.`
          : 'Это демо: запись сохранится только в этом браузере. В Telegram подтверждение и напоминание приходят в чат с ботом.'
      }</p>`;
  },

  done() {
    const b = s.last!;
    const d = describe(b);
    return `
      <div class="done">
        <span class="done__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>
        <h2>Вы записаны</h2>
        <p>${esc(d.master)} ждёт вас ${esc(d.when)}.</p>
        <p class="hint">${esc(d.service)} · ${esc(d.price)}</p>
        <p class="hint">${shell.inTelegram ? 'Подтверждение уже в чате с ботом, там же можно отменить запись.' : embedded ? 'Рядом показано, что пришло бы в чат с ботом.' : 'В Telegram бот прислал бы подтверждение и напомнил о визите.'}</p>
        <div class="done__actions">
          <button class="link" data-act="mine">Мои записи</button>
          <button class="link" data-act="again">Записаться ещё</button>
        </div>
      </div>`;
  },

  mine() {
    if (!s.mine.length)
      return `<div class="empty"><p>Записей пока нет.</p><button class="link" data-act="again">Записаться</button></div>`;
    return `<ul class="cards">${s.mine
      .map((b) => {
        const d = describe(b);
        return `<li class="card"><b>${esc(cap(d.when))}</b><span>${esc(d.service)}, мастер ${esc(d.master)}</span><span class="hint">${esc(d.price)}, оплата на месте</span>
          <button class="danger-link" data-act="cancel" data-id="${esc(b.id)}">Отменить запись</button></li>`;
      })
      .join('')}</ul>`;
  },
};

const titles: Record<Screen, string> = {
  home: 'Запись в барбершоп',
  master: 'Мастер',
  time: 'Дата и время',
  confirm: 'Проверьте запись',
  done: 'Готово',
  mine: 'Мои записи',
};

const steps: Partial<Record<Screen, number>> = { master: 2, time: 3, confirm: 4 };

function subtitle() {
  const n = steps[s.screen];
  if (!n) return '';
  const sv = serviceById(s.service)?.name ?? '';
  const who = s.screen !== 'master' && s.master !== ANY ? ` · ${masterById(s.master)?.name}` : '';
  return `Шаг ${n} из 4 · ${sv}${who}`;
}

function render(focus = false) {
  root.innerHTML = views[s.screen]();
  titleEl.textContent = titles[s.screen];
  stepEl.textContent = subtitle();
  document.documentElement.dataset.screen = s.screen;
  setButtons();
  if (focus) {
    root.classList.remove('enter');
    void root.offsetWidth;
    root.classList.add('enter');
    titleEl.focus({ preventScroll: true });
    scrollTo(0, 0);
  }
}

function go(screen: Screen) {
  s.screen = screen;
  render(true);
}

const backOf: Partial<Record<Screen, Screen>> = { master: 'home', time: 'master', confirm: 'time', mine: 'home' };

function setButtons() {
  const back = backOf[s.screen];
  shell.setBack(back ? () => go(back) : null);
  if (s.screen === 'time' && s.start !== null) shell.setMain({ text: `Продолжить · ${fmtTime(s.start)}`, onClick: () => go('confirm') });
  else if (s.screen === 'confirm') shell.setMain({ text: `Записаться · ${fmtPrice(priceFor(s.service, s.master))}`, onClick: submit, progress: s.busy });
  else if (s.screen === 'done') shell.setMain({ text: 'Готово', onClick: () => (shell.inTelegram ? shell.done() : again()) });
  else shell.setMain(null);
}

let toastTimer = 0;
function toast(text: string) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), 3500);
}

async function submit() {
  if (s.busy || s.start === null) return;
  s.busy = true;
  setButtons();
  try {
    const res = await api.book({ service: s.service, master: s.master, date: s.date, start: s.start });
    if (res.ok) {
      s.last = res.booking;
      s.mine = await api.mine();
      shell.haptic('success');
      tellHost('booked', res.booking);
      s.busy = false;
      go('done');
      return;
    }
    shell.haptic('error');
    toast(res.error);
    s.start = null;
    s.busy = false;
    go('time');
  } catch {
    s.busy = false;
    shell.haptic('error');
    toast('Сервер записи не отвечает, попробуйте ещё раз');
    setButtons();
  }
}

async function again() {
  s.service = '';
  s.master = ANY;
  s.start = null;
  await api.refresh().catch(() => {});
  go('home');
}

async function cancel(id: string, ask = true) {
  const b = s.mine.find((x) => x.id === id);
  if (!b) return;
  const d = describe(b);
  if (ask && !(await shell.confirm(`Отменить запись ${d.when}?`))) return;
  const ok = await api.cancel(id).catch(() => false);
  if (!ok) return toast('Не получилось отменить, попробуйте ещё раз');
  s.mine = s.mine.filter((x) => x.id !== id);
  shell.haptic('tap');
  tellHost('cancelled', b);
  toast('Запись отменена');
  render();
}

root.addEventListener('click', async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el) return;
  const id = el.dataset.id ?? '';
  switch (el.dataset.act) {
    case 'service':
      shell.haptic('tap');
      s.service = id;
      s.master = ANY;
      s.start = null;
      return go('master');
    case 'master': {
      shell.haptic('tap');
      s.master = id;
      s.start = null;
      const n = nearest(s.service, id, api.busy(), mskNow());
      s.date = n?.date ?? mskNow().date;
      return go('time');
    }
    case 'day':
      shell.haptic('select');
      s.date = id;
      s.start = null;
      return render();
    case 'slot':
      shell.haptic('select');
      s.start = Number(id);
      return render();
    case 'jump': {
      const [d, t] = id.split('|');
      s.date = d;
      s.start = Number(t);
      shell.haptic('select');
      return render();
    }
    case 'mine':
      s.mine = await api.mine().catch(() => s.mine);
      return go('mine');
    case 'again':
      return again();
    case 'cancel':
      return cancel(id);
  }
});

// Отмена кнопкой из «чата с ботом» на странице кейса
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.source !== 'barber313-host') return;
  if (e.data.type === 'cancel') cancel(String(e.data.id), false);
});

function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

function cap(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

async function start() {
  shell = await createShell(mainEl, backEl);
  api = shell.inTelegram ? serverApi(shell.initData) : localApi();
  try {
    await api.refresh();
    s.mine = await api.mine();
  } catch {
    toast('Сервер записи не отвечает, свободное время может быть неточным');
  }
  // Ссылка с ?service=cut сразу открывает выбор мастера: для кнопок в чате
  const pre = new URLSearchParams(location.search).get('service');
  if (pre && serviceById(pre)) {
    s.service = pre;
    s.screen = 'master';
  }
  render();
  document.documentElement.classList.add('ready');
}

start();
