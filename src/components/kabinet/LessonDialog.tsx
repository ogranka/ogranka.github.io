// Окно занятия: подробности и три действия для запланированного занятия.
// Правило отмены показано прямо в окне, перенос проверяет пересечения.
import { useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import { balance, findConflict, isLateCancel, HOUR } from '../../scripts/kabinet/rules';
import type { KabinetState, Lesson } from '../../scripts/kabinet/types';
import { dateTime, lessonsWord, toLocalInput } from '../../scripts/kabinet/format';
import { Dialog } from './Dialog';
import { Icon } from './Icons';

interface Props {
  state: KabinetState;
  lesson: Lesson;
  requestId?: string;
  busy: boolean;
  run: (action: () => Promise<KabinetState>, success?: string) => Promise<boolean>;
  onClose: () => void;
}

type Mode = 'info' | 'done' | 'move' | 'cancel';

export function LessonDialog({ state, lesson, requestId, busy, run, onClose }: Props) {
  const student = state.students.find((s) => s.id === lesson.studentId)!;
  const request = requestId ? state.requests.find((r) => r.id === requestId) : undefined;
  const planned = lesson.status === 'planned';
  const [mode, setMode] = useState<Mode>(request ? 'move' : 'info');
  const [topic, setTopic] = useState(lesson.topic);
  const [note, setNote] = useState(lesson.note ?? '');
  const [reason, setReason] = useState('');
  const [when, setWhen] = useState(toLocalInput(request ? new Date(new Date(lesson.start).getTime() + 24 * HOUR).toISOString() : lesson.start));

  const now = new Date();
  const hoursLeft = Math.round((new Date(lesson.start).getTime() - now.getTime()) / HOUR);
  const late = isLateCancel(lesson, now, state.settings.freeCancelHours);
  const left = balance(state, student.id);
  // Пересечение видно сразу, до нажатия «Перенести»
  const clash = when ? findConflict(state, new Date(when), lesson.minutes, lesson.id) : undefined;
  const clashWith = clash ? state.students.find((s) => s.id === clash.studentId)?.name : '';

  const act = async (fn: () => Promise<KabinetState>, ok: string) => {
    if (await run(fn, ok)) onClose();
  };

  const status = lesson.status === 'done' ? 'Проведено' : lesson.status === 'cancelled' ? (lesson.charged ? 'Отменено, занятие списано' : 'Отменено без списания') : 'Запланировано';

  return (
    <Dialog title={student.name} onClose={onClose}>
      <dl className="kb-facts">
        <div>
          <dt>Когда</dt>
          <dd>
            {dateTime(lesson.start)}, {lesson.minutes} мин
          </dd>
        </div>
        <div>
          <dt>Тема</dt>
          <dd>{lesson.topic}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{status}</dd>
        </div>
        {lesson.movedFrom && (
          <div>
            <dt>Перенесено</dt>
            <dd>с {dateTime(lesson.movedFrom)}</dd>
          </div>
        )}
        {lesson.note && (
          <div>
            <dt>Заметка</dt>
            <dd>{lesson.note}</dd>
          </div>
        )}
        <div>
          <dt>Абонемент</dt>
          <dd className={left <= 0 ? 'kb-text-bad' : left === 1 ? 'kb-text-warn' : ''}>{left < 0 ? `долг ${lessonsWord(-left)}` : `осталось ${lessonsWord(left)}`}</dd>
        </div>
      </dl>

      {request && request.status === 'open' && (
        <div className="kb-callout">
          <b>{student.parent.name} просит перенести</b>
          <p>«{request.wish}»</p>
        </div>
      )}

      {planned && (
        <div className="kb-tabs" role="group" aria-label="Действие с занятием">
          <button type="button" aria-pressed={mode === 'done'} onClick={() => setMode('done')}>
            <Icon name="check" /> Проведено
          </button>
          <button type="button" aria-pressed={mode === 'move'} onClick={() => setMode('move')}>
            <Icon name="move" /> Перенести
          </button>
          <button type="button" aria-pressed={mode === 'cancel'} onClick={() => setMode('cancel')}>
            <Icon name="cancel" /> Отменить
          </button>
        </div>
      )}

      {planned && mode === 'done' && (
        <form className="kb-form" onSubmit={(e) => { e.preventDefault(); act(() => api.markDone(lesson.id, topic, note), `Отмечено, у ${student.name.split(' ')[0]} осталось ${lessonsWord(left - 1)}`); }}>
          <label className="kb-field">
            <span>Тема занятия</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label className="kb-field">
            <span>Заметка для отчёта родителям</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Что получилось, над чем работать" />
          </label>
          <p className="kb-hint">Занятие спишется из абонемента: останется {lessonsWord(left - 1)}.</p>
          <button type="submit" className="kb-btn" disabled={busy}>
            Отметить проведённым
          </button>
        </form>
      )}

      {planned && mode === 'move' && (
        <form className="kb-form" onSubmit={(e) => { e.preventDefault(); act(() => api.move(lesson.id, new Date(when).toISOString(), request?.id), 'Занятие перенесено'); }}>
          <label className="kb-field">
            <span>Новые дата и время</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required aria-describedby="kb-move-hint" />
          </label>
          <p id="kb-move-hint" className={clash ? 'kb-hint kb-text-bad' : 'kb-hint'} role={clash ? 'alert' : undefined}>
            {clash ? `Это время занято: ${clashWith}, ${dateTime(clash.start)}. Выберите другое.` : 'Пересечений нет. Перенос не списывает занятие.'}
          </p>
          <div className="kb-form__row">
            <button type="submit" className="kb-btn" disabled={busy || !!clash}>
              Перенести занятие
            </button>
            {request && request.status === 'open' && (
              <button type="button" className="kb-btn kb-btn--ghost" disabled={busy} onClick={() => act(() => api.declineRequest(request.id), 'Запрос отклонён')}>
                Отклонить запрос
              </button>
            )}
          </div>
        </form>
      )}

      {planned && mode === 'cancel' && (
        <form className="kb-form" onSubmit={(e) => { e.preventDefault(); act(() => api.cancel(lesson.id, reason), late ? 'Отменено, занятие списано' : 'Отменено без списания'); }}>
          <div className={late ? 'kb-callout kb-callout--bad' : 'kb-callout kb-callout--ok'}>
            <b>{late ? 'Занятие спишется из абонемента' : 'Отмена бесплатная'}</b>
            <p>
              Правило: отмена позже чем за {state.settings.freeCancelHours} ч до начала списывает занятие.{' '}
              {hoursLeft > 0 ? `До начала ${hoursLeft} ч.` : 'Занятие уже началось.'} Срок меняется в настройках.
            </p>
          </div>
          <label className="kb-field">
            <span>Причина, увидят родители</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например, заболел" />
          </label>
          <button type="submit" className="kb-btn kb-btn--bad" disabled={busy}>
            Отменить занятие
          </button>
        </form>
      )}
    </Dialog>
  );
}
