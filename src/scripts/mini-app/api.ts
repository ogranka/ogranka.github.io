// Данные записи. В браузере всё живёт в localStorage этой вкладки, в Telegram
// идёт на сервер бота. Свободное время в обоих случаях считает core.ts: сервер
// отдаёт только занятые интервалы без имён, а при записи проверяет всё заново.
import { book, mskNow, type BookInput, type BookResult, type Booking } from './core';

export interface Api {
  /** Занятые записи всех клиентов: для расчёта свободного времени */
  busy(): Booking[];
  refresh(): Promise<void>;
  book(input: BookInput): Promise<BookResult>;
  mine(): Promise<Booking[]>;
  cancel(id: string): Promise<boolean>;
}

const KEY = 'barber313';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () => Math.random().toString(36).slice(2, 10);

export function localApi(): Api {
  const load = (): Booking[] => {
    try {
      const all: Booking[] = JSON.parse(localStorage.getItem(KEY) || '[]');
      const now = mskNow();
      // Прошедшие визиты не храним
      return all.filter((b) => b.date > now.date || (b.date === now.date && b.start + b.dur > now.min));
    } catch {
      return [];
    }
  };
  const save = (list: Booking[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  };
  let list = load();
  return {
    busy: () => list,
    async refresh() {
      list = load();
    },
    async book(input) {
      await wait(450);
      const res = book(input, 'guest', list, mskNow(), newId());
      if (res.ok) save(list);
      return res;
    },
    async mine() {
      return [...list].sort(byTime);
    },
    async cancel(id) {
      await wait(250);
      list = list.filter((b) => b.id !== id);
      save(list);
      return true;
    },
  };
}

const BASE = '/api/313';

export function serverApi(initData: string): Api {
  let busy: Booking[] = [];
  const call = async (path: string, body?: unknown) => {
    const r = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': initData },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok && !data.error) data.error = r.status === 429 ? 'Слишком много запросов, попробуйте через минуту' : 'Сервер записи не отвечает, попробуйте ещё раз';
    return data;
  };
  return {
    busy: () => busy,
    async refresh() {
      const d = await call('/busy');
      if (Array.isArray(d.busy)) busy = d.busy;
    },
    async book(input) {
      const d = await call('/book', input);
      if (d.booking) {
        busy = [...busy, d.booking];
        return { ok: true, booking: d.booking };
      }
      // Время могли занять из другого окна: подтягиваем свежую занятость
      await this.refresh().catch(() => {});
      return { ok: false, error: d.error || 'Не получилось записаться' };
    },
    async mine() {
      const d = await call('/my');
      return Array.isArray(d.bookings) ? d.bookings.sort(byTime) : [];
    },
    async cancel(id) {
      const d = await call('/cancel', { id });
      if (d.ok) busy = busy.filter((b) => b.id !== id);
      return !!d.ok;
    },
  };
}

const byTime = (a: Booking, b: Booking) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1);
