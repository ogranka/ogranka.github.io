// Кабинет родителя: только свой ребёнок. Менять ничего нельзя, можно
// попросить перенос, запрос сразу появляется у репетитора.
import { useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import { balance } from '../../scripts/kabinet/rules';
import type { KabinetState, Lesson } from '../../scripts/kabinet/types';
import { dateTime, rub } from '../../scripts/kabinet/format';
import { BalanceBadge } from './Badge';
import { Dialog } from './Dialog';
import { Icon } from './Icons';
import { MonthPicker, months, ReportSheet } from './Report';

interface Props {
  state: KabinetState;
  studentId: string;
  busy: boolean;
  run: (action: () => Promise<KabinetState>, success?: string) => Promise<boolean>;
}

export function Parent({ state, studentId, busy, run }: Props) {
  const s = state.students.find((x) => x.id === studentId)!;
  const [asking, setAsking] = useState<Lesson | null>(null);
  const [mi, setMi] = useState(0);
  const now = Date.now();
  const mine = state.lessons.filter((l) => l.studentId === s.id);
  const upcoming = mine.filter((l) => l.status === 'planned' && new Date(l.start).getTime() > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  const openFor = (id: string) => state.requests.find((r) => r.lessonId === id && r.status === 'open');
  const left = balance(state, s.id);
  const m = months()[mi];

  return (
    <div className="kb-parent">
      <header className="kb-view-head kb-noprint">
        <div>
          <h1>Здравствуйте, {s.parent.name}</h1>
          <p className="kb-muted">
            {s.name}, {state.tutor.subject}. Занятия ведёт {state.tutor.name}
          </p>
        </div>
      </header>

      <dl className="kb-totals kb-noprint">
        <div>
          <dt>Абонемент</dt>
          <dd>
            <BalanceBadge left={left} />
          </dd>
        </div>
        <div>
          <dt>Цена занятия</dt>
          <dd>{rub(s.pricePerLesson)}</dd>
        </div>
        <div>
          <dt>Следующее занятие</dt>
          <dd>{upcoming[0] ? dateTime(upcoming[0].start) : 'не назначено'}</dd>
        </div>
      </dl>

      <section className="kb-noprint" aria-labelledby="kb-parent-next">
        <h2 id="kb-parent-next" className="kb-subhead">
          Ближайшие занятия
        </h2>
        <ul className="kb-rows kb-rows--actions">
          {upcoming.map((l) => {
            const req = openFor(l.id);
            return (
              <li key={l.id}>
                <span>
                  <b>{dateTime(l.start)}</b>
                  {l.movedFrom && <span className="kb-muted"> перенесено</span>}
                </span>
                {req ? (
                  <span className="kb-badge kb-badge--accent">Запрос отправлен</span>
                ) : (
                  <button type="button" className="kb-btn kb-btn--ghost kb-btn--small" onClick={() => setAsking(l)}>
                    <Icon name="move" /> Попросить перенос
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="kb-parent-report">
        <header className="kb-view-head kb-noprint">
          <h2 id="kb-parent-report" className="kb-subhead">
            Отчёт за месяц
          </h2>
          <button type="button" className="kb-btn kb-btn--ghost" onClick={() => window.print()}>
            <Icon name="print" /> Сохранить в PDF
          </button>
        </header>
        <div className="kb-report-controls kb-noprint">
          <MonthPicker value={mi} onChange={setMi} />
        </div>
        <ReportSheet state={state} studentId={s.id} year={m.year} month={m.month} />
      </section>

      {asking && <AskDialog lesson={asking} busy={busy} run={run} onClose={() => setAsking(null)} />}
    </div>
  );
}

function AskDialog({ lesson, busy, run, onClose }: { lesson: Lesson; onClose: () => void } & Pick<Props, 'busy' | 'run'>) {
  const [wish, setWish] = useState('');
  return (
    <Dialog title="Перенос занятия" onClose={onClose}>
      <form
        className="kb-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.requestMove(lesson.id, wish), 'Запрос отправлен преподавателю')) onClose();
        }}
      >
        <p>Занятие {dateTime(lesson.start)}. Преподаватель увидит запрос и предложит время.</p>
        <label className="kb-field">
          <span>Когда удобно</span>
          <textarea rows={3} value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Например, в четверг после 17:00" required />
        </label>
        <button type="submit" className="kb-btn" disabled={busy}>
          Отправить запрос
        </button>
      </form>
    </Dialog>
  );
}
