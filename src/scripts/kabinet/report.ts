// Отчёт родителю за месяц: собирается из занятий и оплат сам.
import { balance, isCharged } from './rules';
import type { KabinetState, Lesson } from './types';

export interface MonthReport {
  month: string;
  done: Lesson[];
  cancelledFree: number;
  cancelledCharged: number;
  moved: number;
  paidLessons: number;
  paidAmount: number;
  spent: number;
  balanceNow: number;
  notes: string[];
}

export function monthReport(state: KabinetState, studentId: string, year: number, month: number): MonthReport {
  const inMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() === month;
  };
  const lessons = state.lessons.filter((l) => l.studentId === studentId && inMonth(l.start)).sort((a, b) => a.start.localeCompare(b.start));
  const payments = state.payments.filter((p) => p.studentId === studentId && inMonth(p.date));
  const done = lessons.filter((l) => l.status === 'done');
  return {
    month: new Date(year, month, 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''),
    done,
    cancelledFree: lessons.filter((l) => l.status === 'cancelled' && !l.charged).length,
    cancelledCharged: lessons.filter((l) => l.status === 'cancelled' && l.charged).length,
    moved: lessons.filter((l) => l.movedFrom).length,
    paidLessons: payments.reduce((s, p) => s + p.lessons, 0),
    paidAmount: payments.reduce((s, p) => s + p.amount, 0),
    spent: lessons.filter(isCharged).length,
    balanceNow: balance(state, studentId),
    notes: done.map((l) => l.note).filter((x): x is string => !!x),
  };
}
