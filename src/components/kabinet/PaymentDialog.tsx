// Оплата пакета: число занятий добавляется к остатку ученика.
import { useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import type { KabinetState } from '../../scripts/kabinet/types';
import { lessonsWord, rub } from '../../scripts/kabinet/format';
import { Dialog } from './Dialog';

interface Props {
  state: KabinetState;
  studentId?: string;
  busy: boolean;
  run: (action: () => Promise<KabinetState>, success?: string) => Promise<boolean>;
  onClose: () => void;
}

const PACKS = [4, 8, 12];

export function PaymentDialog({ state, studentId, busy, run, onClose }: Props) {
  const [sid, setSid] = useState(studentId ?? state.students[0].id);
  const [lessons, setLessons] = useState(8);
  const student = state.students.find((s) => s.id === sid)!;
  const amount = lessons * student.pricePerLesson;
  return (
    <Dialog title="Новая оплата" onClose={onClose}>
      <form
        className="kb-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.addPayment(sid, lessons, amount), `Оплата принята: +${lessonsWord(lessons)} у ${student.name.split(' ')[0]}`)) onClose();
        }}
      >
        <label className="kb-field">
          <span>Ученик</span>
          <select value={sid} onChange={(e) => setSid(e.target.value)}>
            {state.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="kb-field">
          <legend>Пакет занятий</legend>
          <div className="kb-chips">
            {PACKS.map((n) => (
              <button key={n} type="button" aria-pressed={lessons === n} onClick={() => setLessons(n)}>
                <b>{n}</b>
                <span>{rub(n * student.pricePerLesson)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="kb-hint">
          {rub(student.pricePerLesson)} за занятие. К остатку добавится {lessonsWord(lessons)}.
        </p>
        <button type="submit" className="kb-btn" disabled={busy}>
          Принять {rub(amount)}
        </button>
      </form>
    </Dialog>
  );
}
