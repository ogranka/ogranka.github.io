// Барбершоп «313»: услуги, мастера, расписание и правила записи. Общий модуль
// для мини-приложения и сервера бота, поэтому без импортов и без синтаксиса,
// который Node не умеет вырезать сам: сервер берёт копию этого файла как есть.

export const TZ = 'Europe/Moscow';
/** Минуты от полуночи: открытие, закрытие и шаг сетки записи */
export const OPEN = 10 * 60;
export const CLOSE = 22 * 60;
export const STEP = 30;
export const DAYS_AHEAD = 14;
/** Ближе чем за полчаса до начала записаться нельзя */
export const LEAD = 30;

export interface Service {
  id: string;
  group: string;
  name: string;
  /** Длительность в минутах, кратна шагу сетки */
  dur: number;
  price: number;
  note: string;
}

export interface Master {
  id: string;
  name: string;
  level: string;
  years: number;
  /** Надбавка к цене любой услуги */
  extra: number;
  /** Услуги, которых мастер не делает */
  skip: string[];
  /** Выходные по дням недели, 0 это воскресенье */
  off: number[];
  color: string;
}

export interface Booking {
  id: string;
  user: string;
  service: string;
  master: string;
  date: string;
  start: number;
  dur: number;
  price: number;
  created: number;
}

export interface Slot {
  start: number;
  masters: string[];
}

export interface Now {
  date: string;
  min: number;
}

export const services: Service[] = [
  { id: 'cut', group: 'Стрижки', name: 'Мужская стрижка', dur: 60, price: 1800, note: 'Консультация, мытьё головы и укладка' },
  { id: 'clipper', group: 'Стрижки', name: 'Стрижка машинкой', dur: 30, price: 1200, note: 'Одна или две насадки, окантовка' },
  { id: 'kids', group: 'Стрижки', name: 'Детская стрижка', dur: 30, price: 1300, note: 'Для детей до 12 лет' },
  { id: 'combo', group: 'Стрижка и борода', name: 'Стрижка и борода', dur: 90, price: 2900, note: 'Стрижка, форма бороды, горячее полотенце' },
  { id: 'beard', group: 'Стрижка и борода', name: 'Моделирование бороды', dur: 30, price: 1300, note: 'Форма, контур, уход маслом' },
  { id: 'shave', group: 'Стрижка и борода', name: 'Королевское бритьё', dur: 60, price: 1600, note: 'Опасная бритва и горячее полотенце' },
];

export const masters: Master[] = [
  { id: 'artem', name: 'Артём', level: 'Топ-барбер', years: 9, extra: 400, skip: ['kids'], off: [1], color: '#c0474f' },
  { id: 'ilya', name: 'Илья', level: 'Барбер', years: 4, extra: 0, skip: ['shave'], off: [2], color: '#2a6aa3' },
  { id: 'timur', name: 'Тимур', level: 'Барбер', years: 3, extra: 0, skip: [], off: [4], color: '#357a28' },
];

export const ANY = 'any';

export const serviceById = (id: string) => services.find((s) => s.id === id);
export const masterById = (id: string) => masters.find((m) => m.id === id);
export const doesService = (m: Master, serviceId: string) => !m.skip.includes(serviceId);

// Дата и время по Москве, где бы ни был телефон или сервер
export function mskNow(at = Date.now()): Now {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, min: Number(get('hour')) * 60 + Number(get('minute')) };
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
export const addDays = (date: string, n: number) => {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekday = (date: string) => utc(date).getUTCDay();
export const bookingDays = (now: Now) => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(now.date, i));

// Занятость «с улицы»: детерминированная, чтобы приложение и сервер видели
// одно и то же расписание без общей базы. Вечером занято чаще, чем утром.
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

function baseBusy(masterId: string, date: string, start: number) {
  const p = start < 12 * 60 ? 0.18 : start < 17 * 60 ? 0.3 : 0.42;
  return hash(`${masterId}|${date}|${start}`) < p;
}

export function masterFree(m: Master, date: string, start: number, dur: number, bookings: Booking[], now: Now) {
  if (m.off.includes(weekday(date))) return false;
  if (start < OPEN || start + dur > CLOSE || start % STEP) return false;
  if (date < now.date || (date === now.date && start < now.min + LEAD)) return false;
  for (let t = start; t < start + dur; t += STEP) if (baseBusy(m.id, date, t)) return false;
  return !bookings.some((b) => b.master === m.id && b.date === date && b.start < start + dur && start < b.start + b.dur);
}

/** Свободные начала записи на день: для мастера или для «любого» */
export function slotsFor(date: string, serviceId: string, masterId: string, bookings: Booking[], now: Now): Slot[] {
  const s = serviceById(serviceId);
  if (!s) return [];
  const pool = masters.filter((m) => doesService(m, serviceId) && (masterId === ANY || m.id === masterId));
  const out: Slot[] = [];
  for (let t = OPEN; t + s.dur <= CLOSE; t += STEP) {
    const free = pool.filter((m) => masterFree(m, date, t, s.dur, bookings, now)).map((m) => m.id);
    if (free.length) out.push({ start: t, masters: free });
  }
  return out;
}

export function nearest(serviceId: string, masterId: string, bookings: Booking[], now: Now) {
  for (const date of bookingDays(now)) {
    const slots = slotsFor(date, serviceId, masterId, bookings, now);
    if (slots.length) return { date, start: slots[0].start };
  }
  return null;
}

/** «Любой мастер» достаётся самому доступному по цене, при равенстве по порядку в списке */
export function pickMaster(ids: string[]) {
  return masters.filter((m) => ids.includes(m.id)).sort((a, b) => a.extra - b.extra)[0]?.id;
}

export function priceFor(serviceId: string, masterId: string) {
  const s = serviceById(serviceId);
  if (!s) return 0;
  if (masterId === ANY) return s.price;
  return s.price + (masterById(masterId)?.extra ?? 0);
}

export interface BookInput {
  service: string;
  master: string;
  date: string;
  start: number;
}

export type BookResult = { ok: true; booking: Booking } | { ok: false; error: string };

/** Проверка и создание записи. Вызывается синхронно: между проверкой и добавлением
 *  в список никто не вклинится, поэтому один слот не займут дважды. */
export function book(input: BookInput, user: string, bookings: Booking[], now: Now, id: string): BookResult {
  const s = serviceById(input.service);
  if (!s) return { ok: false, error: 'Такой услуги нет' };
  if (!bookingDays(now).includes(input.date)) return { ok: false, error: 'На этот день запись не открыта' };
  const slot = slotsFor(input.date, s.id, input.master, bookings, now).find((x) => x.start === input.start);
  if (!slot) return { ok: false, error: 'Это время уже заняли, выберите другое' };
  const master = input.master === ANY ? pickMaster(slot.masters) : input.master;
  if (!master) return { ok: false, error: 'Это время уже заняли, выберите другое' };
  const booking: Booking = {
    id,
    user,
    service: s.id,
    master,
    date: input.date,
    start: input.start,
    dur: s.dur,
    price: priceFor(s.id, master),
    created: Date.now(),
  };
  bookings.push(booking);
  return { ok: true, booking };
}

// Подписи для людей
const NB = ' ';
const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const wdShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const fmtTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const fmtPrice = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}₽`;
export const fmtDur = (min: number) => (min < 60 ? `${min}${NB}мин` : min % 60 ? `${Math.floor(min / 60)}${NB}ч ${min % 60}${NB}мин` : `${min / 60}${NB}ч`);
export const dayNum = (date: string) => Number(date.slice(8, 10));
export const wd = (date: string) => wdShort[weekday(date)];
export function fmtDay(date: string, now: Now) {
  const d = `${dayNum(date)}${NB}${months[Number(date.slice(5, 7)) - 1]}`;
  if (date === now.date) return `сегодня, ${d}`;
  if (date === addDays(now.date, 1)) return `завтра, ${d}`;
  return `${wd(date)}, ${d}`;
}

/** Коротко для подписей «ближайшее»: сегодня, завтра или «пн, 2 ноября» */
export function fmtDayShort(date: string, now: Now) {
  if (date === now.date) return 'сегодня';
  if (date === addDays(now.date, 1)) return 'завтра';
  return `${wd(date)}, ${dayNum(date)}${NB}${months[Number(date.slice(5, 7)) - 1]}`;
}
