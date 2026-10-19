// Пробные занятия: заявки родителей и перевод в ученики с абонементом.
import { useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import { findConflict } from '../../scripts/kabinet/rules';
import type { KabinetState, Trial } from '../../scripts/kabinet/types';
import { dateTime, lessonsWord, rub, lowerFirst } from '../../scripts/kabinet/format';
import { Dialog } from './Dialog';

interface Props {
  state: KabinetState;
  busy: boolean;
  run: (action: () => Promise<KabinetState>, success?: string) => Promise<boolean>;
}

const LABEL: Record<Trial['status'], string> = {
  new: 'Новая заявка',
  scheduled: 'Пробное назначено',
  converted: 'Стал учеником',
  declined: 'Отказались',
};

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export function Trials({ state, busy, run }: Props) {
  const [converting, setConverting] = useState<Trial | null>(null);
  const order: Trial['status'][] = ['new', 'scheduled', 'converted', 'declined'];
  const trials = [...state.trials].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <section aria-labelledby="kb-trials-title">
      <header className="kb-view-head">
        <div>
          <h1 id="kb-trials-title">Пробные</h1>
          <p className="kb-muted">Заявки с сайта и от знакомых. После пробного ученик переходит на абонемент</p>
        </div>
      </header>
      <ul className="kb-cards">
        {trials.map((t) => (
          <li key={t.id}>
            <article className={`kb-card is-${t.status}`}>
              <span className="kb-card__top">
                <b>{t.childName}</b>
                <span className={`kb-badge${t.status === 'new' ? ' kb-badge--accent' : ''}`}>{LABEL[t.status]}</span>
              </span>
              <span className="kb-muted">
                {t.grade}, {lowerFirst(t.goal)}
              </span>
              <span className="kb-card__meta">
                {t.parent.name}, {t.parent.phone}
                {t.at && t.status === 'scheduled' ? `. Пробное ${dateTime(t.at)}` : ''}
              </span>
              {(t.status === 'new' || t.status === 'scheduled') && (
                <span className="kb-form__row">
                  <button type="button" className="kb-btn kb-btn--small" onClick={() => setConverting(t)}>
                    Оформить абонемент
                  </button>
                  <button type="button" className="kb-btn kb-btn--ghost kb-btn--small" disabled={busy} onClick={() => run(() => api.setTrialStatus(t.id, 'declined'), 'Заявка закрыта')}>
                    Отказались
                  </button>
                </span>
              )}
              {t.status === 'declined' && (
                <span className="kb-form__row">
                  <button type="button" className="kb-btn kb-btn--ghost kb-btn--small" disabled={busy} onClick={() => run(() => api.setTrialStatus(t.id, 'new'), 'Заявка снова в работе')}>
                    Вернуть в работу
                  </button>
                </span>
              )}
            </article>
          </li>
        ))}
      </ul>
      {converting && <ConvertDialog state={state} trial={converting} busy={busy} run={run} onClose={() => setConverting(null)} />}
    </section>
  );
}

function ConvertDialog({ state, trial, busy, run, onClose }: Props & { trial: Trial; onClose: () => void }) {
  const [weekday, setWeekday] = useState(1);
  const [hour, setHour] = useState(17);
  const [lessons, setLessons] = useState(8);
  const [price, setPrice] = useState(1800);
  const { dayStart, dayEnd } = state.settings;

  // Ближайшая такая же дата, чтобы предупредить о пересечении до отправки
  const first = new Date();
  first.setHours(hour, 0, 0, 0);
  while ((first.getDay() + 6) % 7 !== weekday || first <= new Date()) first.setDate(first.getDate() + 1);
  const clash = [0, 1, 2, 3].map((w) => findConflict(state, new Date(first.getTime() + w * 7 * 86_400_000), 60)).find(Boolean);
  const clashWith = clash ? state.students.find((s) => s.id === clash.studentId)?.name : '';

  return (
    <Dialog title={`${trial.childName}: абонемент`} onClose={onClose}>
      <form
        className="kb-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.convertTrial(trial.id, { weekday, hour, lessons, price }), `${trial.childName} в учениках, ${lessonsWord(lessons)} оплачено`)) onClose();
        }}
      >
        <div className="kb-form__row kb-form__row--fields">
          <label className="kb-field">
            <span>День</span>
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="kb-field">
            <span>Время</span>
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {Array.from({ length: dayEnd - dayStart }, (_, i) => dayStart + i).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="kb-form__row kb-form__row--fields">
          <label className="kb-field">
            <span>Пакет, занятий</span>
            <select value={lessons} onChange={(e) => setLessons(Number(e.target.value))}>
              {[4, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="kb-field">
            <span>Цена занятия, ₽</span>
            <input type="number" min={500} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </label>
        </div>
        <p className={clash ? 'kb-hint kb-text-bad' : 'kb-hint'} role={clash ? 'alert' : undefined}>
          {clash
            ? `Это время занято: ${clashWith}, ${dateTime(clash.start)}. Выберите другой день или час.`
            : `Первое занятие ${dateTime(first.toISOString())}, дальше каждую неделю. Оплата ${rub(lessons * price)}.`}
        </p>
        <button type="submit" className="kb-btn" disabled={busy || !!clash || price < 500}>
          Оформить на {lessonsWord(lessons)}
        </button>
      </form>
    </Dialog>
  );
}
