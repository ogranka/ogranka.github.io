// Неделя занятий: сетка дней и часов на десктопе, список дня на телефоне.
// Занятие открывает окно с действиями; прошедшее и не отмеченное подсвечено.
import { useMemo, useState } from 'react';
import { addDays, startOfWeek } from '../../scripts/kabinet/rules';
import type { KabinetState, Lesson } from '../../scripts/kabinet/types';
import { dateTime, dayLabel, time } from '../../scripts/kabinet/format';
import { Icon } from './Icons';

interface Props {
  state: KabinetState;
  onOpenLesson: (lesson: Lesson, requestId?: string) => void;
}

const ROW = 72;

export function Week({ state, onOpenLesson }: Props) {
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [mobileDay, setMobileDay] = useState((now.getDay() + 6) % 7);
  const week0 = addDays(startOfWeek(now), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week0, i));
  const { dayStart, dayEnd } = state.settings;
  const hours = Array.from({ length: dayEnd - dayStart }, (_, i) => dayStart + i);
  const student = (id: string) => state.students.find((s) => s.id === id)!;
  // В узкой колонке недели имя и первая буква фамилии: «Соня М.»
  const short = (name: string) => name.replace(/ (\S)\S*$/, ' $1.');

  const byDay = useMemo(() => {
    const map: Lesson[][] = days.map(() => []);
    for (const l of state.lessons) {
      const d = new Date(l.start);
      const i = Math.floor((d.getTime() - week0.getTime()) / 86_400_000);
      if (i >= 0 && i < 7) map[i].push(l);
    }
    map.forEach((list) => list.sort((a, b) => a.start.localeCompare(b.start)));
    return map;
  }, [state.lessons, week0.getTime()]);

  const openRequests = state.requests.filter((r) => r.status === 'open');
  const due = state.lessons.filter((l) => l.status === 'planned' && new Date(l.start).getTime() + l.minutes * 60_000 < now.getTime());
  const range = `${days[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} – ${days[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;

  // Место занятия в сетке: сверху по времени начала, высота по длительности
  const place = (l: Lesson) => {
    const d = new Date(l.start);
    return { top: (d.getHours() + d.getMinutes() / 60 - dayStart) * ROW + 'px', height: Math.max(52, (l.minutes / 60) * ROW - 4) + 'px' };
  };

  const card = (l: Lesson, full = false) => {
    const s = student(l.studentId);
    const isDue = due.includes(l);
    // Проведённое отмечено галочкой, подпись нужна только отмене и пропущенной отметке
    const status = isDue ? 'не отмечено' : l.status === 'cancelled' ? (l.charged ? 'отмена, списано' : 'отмена') : '';
    const label = l.status === 'done' ? 'проведено' : status;
    return (
      <button
        key={l.id}
        type="button"
        className={`kb-lesson kb-tone-${s.tone} is-${l.status}${isDue ? ' is-due' : ''}`}
        onClick={() => onOpenLesson(l)}
        aria-label={`${s.name}, ${dateTime(l.start)}, ${l.topic}${label ? ', ' + label : ''}`}
      >
        <span className="kb-lesson__head">
          <span className="kb-lesson__time">{time(l.start)}</span>
          <span className="kb-lesson__name">{full ? s.name : short(s.name)}</span>
        </span>
        {status ? <span className="kb-lesson__status">{status}</span> : <span className="kb-lesson__topic">{l.topic}</span>}
      </button>
    );
  };

  return (
    <section className="kb-week" aria-labelledby="kb-week-title">
      <header className="kb-view-head">
        <div>
          <h1 id="kb-week-title">Неделя</h1>
          <p className="kb-muted">{range}</p>
        </div>
        <div className="kb-week__nav">
          <button type="button" className="kb-iconbtn" onClick={() => setOffset(offset - 1)} aria-label="Прошлая неделя">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="kb-btn kb-btn--ghost" onClick={() => setOffset(0)} disabled={offset === 0}>
            Сегодня
          </button>
          <button type="button" className="kb-iconbtn" onClick={() => setOffset(offset + 1)} aria-label="Следующая неделя">
            <Icon name="chevronRight" />
          </button>
        </div>
      </header>

      {(openRequests.length > 0 || due.length > 0) && (
        <div className="kb-attention">
          {openRequests.map((r) => {
            const l = state.lessons.find((x) => x.id === r.lessonId);
            if (!l) return null;
            const s = student(r.studentId);
            return (
              <button key={r.id} type="button" className="kb-attention__item" onClick={() => onOpenLesson(l, r.id)}>
                <b>Запрос на перенос</b>
                <span>
                  {s.name}, {dateTime(l.start)}. {s.parent.name} пишет: «{r.wish}»
                </span>
              </button>
            );
          })}
          {due.map((l) => (
            <button key={l.id} type="button" className="kb-attention__item" onClick={() => onOpenLesson(l)}>
              <b>Отметьте занятие</b>
              <span>
                {student(l.studentId).name}, {dayLabel(new Date(l.start))} в {time(l.start)} прошло и не отмечено
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="kb-grid" style={{ ['--rows' as string]: hours.length, ['--row' as string]: ROW + 'px' }}>
        <div className="kb-grid__hours" aria-hidden="true">
          {hours.map((h) => (
            <span key={h}>{String(h).padStart(2, '0')}:00</span>
          ))}
        </div>
        {days.map((d, i) => {
          const today = d.toDateString() === now.toDateString();
          return (
            <div key={i} className={`kb-grid__day${today ? ' is-today' : ''}`}>
              <div className="kb-grid__dayhead">
                <span>{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                <b>{d.getDate()}</b>
              </div>
              <ul className="kb-grid__col" aria-label={dayLabel(d)}>
                {byDay[i].map((l) => (
                  <li key={l.id} className="kb-grid__slot" style={place(l)}>
                    {card(l)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="kb-daylist">
        <div className="kb-chips" role="group" aria-label="День недели">
          {days.map((d, i) => (
            <button key={i} type="button" aria-pressed={mobileDay === i} onClick={() => setMobileDay(i)}>
              <span>{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
              <b>{d.getDate()}</b>
            </button>
          ))}
        </div>
        <div className="kb-daylist__items">
          {byDay[mobileDay].length ? byDay[mobileDay].map((l) => card(l, true)) : <p className="kb-empty">В этот день занятий нет</p>}
        </div>
      </div>
    </section>
  );
}
