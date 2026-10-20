// Отчёт родителю за месяц: собирается из занятий и оплат, печатается в PDF
// средствами браузера. Лист один и тот же у репетитора и у родителя.
import { useState } from 'react';
import { monthReport } from '../../scripts/kabinet/report';
import type { KabinetState } from '../../scripts/kabinet/types';
import { dayLabel, lessonsWord, rub, lowerFirst } from '../../scripts/kabinet/format';
import { Icon } from './Icons';

export function ReportSheet({ state, studentId, year, month }: { state: KabinetState; studentId: string; year: number; month: number }) {
  const s = state.students.find((x) => x.id === studentId)!;
  const r = monthReport(state, studentId, year, month);
  return (
    <article className="kb-sheet" aria-label={`Отчёт за ${r.month}`}>
      <header className="kb-sheet__head">
        <div>
          <p className="kb-muted">
            {state.tutor.name}, {state.tutor.subject}
          </p>
          <h2>
            {s.name}, отчёт за {r.month}
          </h2>
        </div>
        <p className="kb-muted">
          Для: {s.parent.name}
          <br />
          {s.grade}, {lowerFirst(s.goal)}
        </p>
      </header>

      <dl className="kb-totals kb-totals--sheet">
        <div>
          <dt>Проведено</dt>
          <dd>{lessonsWord(r.done.length)}</dd>
        </div>
        <div>
          <dt>Переносов</dt>
          <dd>{r.moved}</dd>
        </div>
        <div>
          <dt>Отмен</dt>
          <dd>
            {r.cancelledFree + r.cancelledCharged}
            {r.cancelledCharged > 0 && <small>, из них списано {r.cancelledCharged}</small>}
          </dd>
        </div>
        <div>
          <dt>Остаток сейчас</dt>
          <dd className={r.balanceNow <= 0 ? 'kb-text-bad' : r.balanceNow === 1 ? 'kb-text-warn' : ''}>{r.balanceNow < 0 ? `долг ${lessonsWord(-r.balanceNow)}` : lessonsWord(r.balanceNow)}</dd>
        </div>
      </dl>

      <h3>Темы занятий</h3>
      {r.done.length ? (
        <ol className="kb-sheet__topics">
          {r.done.map((l) => (
            <li key={l.id}>
              <span className="kb-muted">{dayLabel(new Date(l.start))}</span> {l.topic}
            </li>
          ))}
        </ol>
      ) : (
        <p className="kb-empty">В этом месяце занятий ещё не было</p>
      )}

      {r.notes.length > 0 && (
        <>
          <h3>Прогресс</h3>
          <ul className="kb-sheet__notes">
            {r.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Оплаты и списания</h3>
      <p>
        Оплачено в месяце: {r.paidLessons ? `${lessonsWord(r.paidLessons)}, ${rub(r.paidAmount)}` : 'оплат не было'}. Списано из абонемента: {lessonsWord(r.spent)}
        {r.spent ? ` на ${rub(r.spent * s.pricePerLesson)}` : ''}.
      </p>
    </article>
  );
}

// Последние три месяца, включая текущий
const months = () => {
  const now = new Date();
  return [0, 1, 2].map((k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('ru-RU', { month: 'long' }) };
  });
};

export function MonthPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <div className="kb-chips" role="group" aria-label="Месяц">
      {months().map((m, i) => (
        <button key={m.label} type="button" aria-pressed={value === i} onClick={() => onChange(i)}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function Reports({ state, initialStudent }: { state: KabinetState; initialStudent?: string }) {
  const [sid, setSid] = useState(initialStudent ?? state.students[0].id);
  const [mi, setMi] = useState(0);
  const m = months()[mi];
  return (
    <section aria-labelledby="kb-report-title">
      <header className="kb-view-head kb-noprint">
        <div>
          <h1 id="kb-report-title">Отчёты</h1>
          <p className="kb-muted">Собираются сами из отметок о занятиях и оплат</p>
        </div>
        <button type="button" className="kb-btn" onClick={() => window.print()}>
          <Icon name="print" /> Сохранить в PDF
        </button>
      </header>
      <div className="kb-report-controls kb-noprint">
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
        <MonthPicker value={mi} onChange={setMi} />
      </div>
      <ReportSheet state={state} studentId={sid} year={m.year} month={m.month} />
    </section>
  );
}

export { months };
