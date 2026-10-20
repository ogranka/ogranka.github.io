// Имитация сервера кабинета. Каждый метод асинхронный, с задержкой как у
// настоящего API, и возвращает новое состояние. Данные лежат в localStorage,
// в рабочей версии на их месте база и REST или GraphQL.
import { createSeed, STATE_VERSION } from './seed';
import { findConflict, isLateCancel } from './rules';
import type { KabinetState, Lesson, MoveRequest } from './types';

const KEY = 'kabinet-demo';

export class ApiError extends Error {}

const wait = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function load(): KabinetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const state = JSON.parse(raw) as KabinetState;
      if (state.version === STATE_VERSION) return state;
    }
  } catch {
    // приватный режим или битые данные: начинаем с чистого демо
  }
  const fresh = createSeed();
  save(fresh);
  return fresh;
}

function save(state: KabinetState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // без хранилища демо работает до перезагрузки
  }
}

let db: KabinetState | null = null;
const state = () => (db ??= load());

// Обёртка метода: задержка, изменение копии, сохранение, ответ копией
async function mutate(fn: (s: KabinetState) => void): Promise<KabinetState> {
  await wait();
  const next = clone(state());
  fn(next);
  db = next;
  save(next);
  return clone(next);
}

const lessonOf = (s: KabinetState, id: string): Lesson => {
  const l = s.lessons.find((x) => x.id === id);
  if (!l) throw new ApiError('Занятие не найдено');
  return l;
};

const describe = (s: KabinetState, l: Lesson) => {
  const who = s.students.find((x) => x.id === l.studentId)?.name ?? 'ученик';
  const when = new Date(l.start).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${who}, ${when}`;
};

export const api = {
  async load() {
    await wait();
    return clone(state());
  },

  async reset() {
    await wait();
    db = createSeed();
    save(db);
    return clone(db);
  },

  markDone(lessonId: string, topic: string, note: string) {
    return mutate((s) => {
      const l = lessonOf(s, lessonId);
      if (l.status === 'cancelled') throw new ApiError('Отменённое занятие нельзя отметить проведённым');
      Object.assign(l, { status: 'done', topic: topic.trim() || l.topic, note: note.trim() || undefined });
    });
  },

  cancel(lessonId: string, reason: string, now = new Date()) {
    return mutate((s) => {
      const l = lessonOf(s, lessonId);
      if (l.status !== 'planned') throw new ApiError('Отменить можно только запланированное занятие');
      Object.assign(l, { status: 'cancelled', charged: isLateCancel(l, now, s.settings.freeCancelHours), note: reason.trim() || undefined });
    });
  },

  move(lessonId: string, startIso: string, requestId?: string) {
    return mutate((s) => {
      const l = lessonOf(s, lessonId);
      if (l.status !== 'planned') throw new ApiError('Перенести можно только запланированное занятие');
      const start = new Date(startIso);
      if (Number.isNaN(start.getTime())) throw new ApiError('Укажите дату и время');
      const clash = findConflict(s, start, l.minutes, l.id);
      if (clash) throw new ApiError(`Время занято: ${describe(s, clash)}`);
      l.movedFrom = l.movedFrom ?? l.start;
      l.start = start.toISOString();
      if (requestId) {
        const r = s.requests.find((x) => x.id === requestId);
        if (r) r.status = 'done';
      }
    });
  },

  addPayment(studentId: string, lessons: number, amount: number) {
    return mutate((s) => {
      if (!s.students.some((x) => x.id === studentId)) throw new ApiError('Ученик не найден');
      if (lessons < 1 || amount < 1) throw new ApiError('Укажите число занятий и сумму');
      s.payments.unshift({ id: uid('p'), studentId, date: new Date().toISOString(), lessons, amount });
    });
  },

  // Пробное занятие стало абонементом: новый ученик, оплата пакета и занятия
  // на четыре недели вперёд в выбранный день и час
  convertTrial(trialId: string, opts: { weekday: number; hour: number; lessons: number; price: number }) {
    return mutate((s) => {
      const t = s.trials.find((x) => x.id === trialId);
      if (!t) throw new ApiError('Заявка не найдена');
      const id = uid('s');
      s.students.push({ id, name: t.childName, grade: t.grade, goal: t.goal, parent: t.parent, pricePerLesson: opts.price, tone: 'green' });
      const first = new Date();
      first.setHours(opts.hour, 0, 0, 0);
      while ((first.getDay() + 6) % 7 !== opts.weekday || first <= new Date()) first.setDate(first.getDate() + 1);
      for (let w = 0; w < 4; w++) {
        const d = new Date(first);
        d.setDate(d.getDate() + w * 7);
        const clash = findConflict(s, d, 60);
        if (clash) throw new ApiError(`Это время занято: ${describe(s, clash)}`);
        s.lessons.push({ id: uid('l'), studentId: id, start: d.toISOString(), minutes: 60, topic: 'Вводное занятие', status: 'planned' });
      }
      s.payments.unshift({ id: uid('p'), studentId: id, date: new Date().toISOString(), lessons: opts.lessons, amount: opts.lessons * opts.price });
      Object.assign(t, { status: 'converted', studentId: id });
    });
  },

  setTrialStatus(trialId: string, status: 'new' | 'declined') {
    return mutate((s) => {
      const t = s.trials.find((x) => x.id === trialId);
      if (t) t.status = status;
    });
  },

  // Родитель просит перенести занятие своего ребёнка
  requestMove(lessonId: string, wish: string) {
    return mutate((s) => {
      const l = lessonOf(s, lessonId);
      if (!wish.trim()) throw new ApiError('Напишите, на когда удобно перенести');
      if (s.requests.some((r) => r.lessonId === lessonId && r.status === 'open')) throw new ApiError('Запрос по этому занятию уже отправлен');
      const r: MoveRequest = { id: uid('r'), lessonId, studentId: l.studentId, wish: wish.trim(), createdAt: new Date().toISOString(), status: 'open' };
      s.requests.unshift(r);
    });
  },

  declineRequest(requestId: string) {
    return mutate((s) => {
      const r = s.requests.find((x) => x.id === requestId);
      if (r) r.status = 'declined';
    });
  },

  setFreeCancelHours(hours: number) {
    return mutate((s) => {
      s.settings.freeCancelHours = Math.max(0, Math.min(72, Math.round(hours)));
    });
  },
};
