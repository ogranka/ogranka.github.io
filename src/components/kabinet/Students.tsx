// Ученики: список с остатком абонемента и карточка с историей и оплатами.
import { useState } from 'react';
import { balance } from '../../scripts/kabinet/rules';
import type { KabinetState, Lesson, Student } from '../../scripts/kabinet/types';
import { dateTime, rub, lowerFirst } from '../../scripts/kabinet/format';
import { BalanceBadge } from './Badge';
import { Dialog } from './Dialog';
import { Icon } from './Icons';

interface Props {
  state: KabinetState;
  onPay: (studentId: string) => void;
  onReport: (studentId: string) => void;
  onOpenLesson: (lesson: Lesson) => void;
}

const nextLesson = (state: KabinetState, id: string) =>
  state.lessons.filter((l) => l.studentId === id && l.status === 'planned' && new Date(l.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start))[0];

export function Students({ state, onPay, onReport, onOpenLesson }: Props) {
  const [open, setOpen] = useState<Student | null>(null);
  return (
    <section aria-labelledby="kb-students-title">
      <header className="kb-view-head">
        <div>
          <h1 id="kb-students-title">Ученики</h1>
          <p className="kb-muted">Остаток занятий считается сам: оплаты минус проведённые и поздние отмены</p>
        </div>
      </header>
      <ul className="kb-cards">
        {state.students.map((s) => {
          const left = balance(state, s.id);
          const next = nextLesson(state, s.id);
          return (
            <li key={s.id}>
              <button type="button" className={`kb-card kb-tone-${s.tone}`} onClick={() => setOpen(s)}>
                <span className="kb-card__top">
                  <b>{s.name}</b>
                  <BalanceBadge left={left} />
                </span>
                <span className="kb-muted">
                  {s.grade}, {lowerFirst(s.goal)}
                </span>
                <span className="kb-card__meta">{next ? `Следующее: ${dateTime(next.start)}` : 'Занятий впереди нет'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <StudentDialog state={state} student={open} onClose={() => setOpen(null)} onPay={onPay} onReport={onReport} onOpenLesson={onOpenLesson} />}
    </section>
  );
}

function StudentDialog({ state, student, onClose, onPay, onReport, onOpenLesson }: { state: KabinetState; student: Student; onClose: () => void } & Omit<Props, 'state'>) {
  const left = balance(state, student.id);
  const lessons = state.lessons.filter((l) => l.studentId === student.id && new Date(l.start) < new Date()).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const payments = state.payments.filter((p) => p.studentId === student.id).slice(0, 4);
  return (
    <Dialog title={student.name} onClose={onClose} wide>
      <div className="kb-student">
        <dl className="kb-facts">
          <div>
            <dt>Класс и цель</dt>
            <dd>
              {student.grade}, {lowerFirst(student.goal)}
            </dd>
          </div>
          <div>
            <dt>Родитель</dt>
            <dd>
              {student.parent.name}, {student.parent.phone}
            </dd>
          </div>
          <div>
            <dt>Абонемент</dt>
            <dd>
              <BalanceBadge left={left} /> по {rub(student.pricePerLesson)}
            </dd>
          </div>
        </dl>
        <div className="kb-form__row">
          <button type="button" className="kb-btn" onClick={() => { onClose(); onPay(student.id); }}>
            <Icon name="plus" /> Оплата
          </button>
          <button type="button" className="kb-btn kb-btn--ghost" onClick={() => { onClose(); onReport(student.id); }}>
            <Icon name="report" /> Отчёт за месяц
          </button>
        </div>
        <h3>Последние занятия</h3>
        <ul className="kb-rows">
          {lessons.map((l) => (
            <li key={l.id}>
              <button type="button" className="kb-row-btn" onClick={() => { onClose(); onOpenLesson(l); }}>
                <span>{dateTime(l.start)}</span>
                <span className={`kb-status is-${l.status}`}>{l.status === 'done' ? l.topic : l.status === 'cancelled' ? (l.charged ? 'отмена, списано' : 'отмена') : 'не отмечено'}</span>
              </button>
            </li>
          ))}
        </ul>
        <h3>Оплаты</h3>
        <ul className="kb-rows">
          {payments.map((p) => (
            <li key={p.id}>
              <span>{new Date(p.date).toLocaleDateString('ru-RU')}</span>
              <span>
                {p.lessons} зан., {rub(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
