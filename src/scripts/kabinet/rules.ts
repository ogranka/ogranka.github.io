// Правила, которые кабинет считает сам: остаток занятий, списание при
// отмене, пересечения в расписании. Чистые функции без доступа к хранилищу.
import type { KabinetState, Lesson } from './types';

export const HOUR = 3_600_000;

// Занятие списывается из абонемента, если проведено или отменено поздно
export const isCharged = (l: Lesson) => l.status === 'done' || (l.status === 'cancelled' && !!l.charged);

export function balance(state: KabinetState, studentId: string) {
  const paid = state.payments.filter((p) => p.studentId === studentId).reduce((s, p) => s + p.lessons, 0);
  const spent = state.lessons.filter((l) => l.studentId === studentId && isCharged(l)).length;
  return paid - spent;
}

// Отмена позже срока списывает занятие
export function isLateCancel(lesson: Lesson, now: Date, freeCancelHours: number) {
  return new Date(lesson.start).getTime() - now.getTime() < freeCancelHours * HOUR;
}

// Занятие, которое пересекается с новым временем; отменённые не мешают
export function findConflict(state: KabinetState, start: Date, minutes: number, ignoreId?: string) {
  const a0 = start.getTime();
  const a1 = a0 + minutes * 60_000;
  return state.lessons.find((l) => {
    if (l.id === ignoreId || l.status === 'cancelled') return false;
    const b0 = new Date(l.start).getTime();
    const b1 = b0 + l.minutes * 60_000;
    return a0 < b1 && b0 < a1;
  });
}

export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
