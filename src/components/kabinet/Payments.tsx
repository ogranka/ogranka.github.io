// Оплаты: итоги месяца, кому пора продлить абонемент и журнал платежей.
import { balance, isCharged } from '../../scripts/kabinet/rules';
import type { KabinetState } from '../../scripts/kabinet/types';
import { lessonsWord, rub } from '../../scripts/kabinet/format';
import { BalanceBadge } from './Badge';
import { Icon } from './Icons';

interface Props {
  state: KabinetState;
  onPay: (studentId?: string) => void;
}

export function Payments({ state, onPay }: Props) {
  const now = new Date();
  const thisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  const name = (id: string) => state.students.find((s) => s.id === id)?.name ?? 'ученик';
  const paid = state.payments.filter((p) => thisMonth(p.date));
  const received = paid.reduce((s, p) => s + p.amount, 0);
  // Сколько стоили проведённые и списанные занятия этого месяца
  const earned = state.lessons
    .filter((l) => thisMonth(l.start) && isCharged(l))
    .reduce((s, l) => s + (state.students.find((x) => x.id === l.studentId)?.pricePerLesson ?? 0), 0);
  const renew = state.students.map((s) => ({ s, left: balance(state, s.id) })).filter((x) => x.left <= 1);
  const journal = [...state.payments].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section aria-labelledby="kb-pay-title">
      <header className="kb-view-head">
        <div>
          <h1 id="kb-pay-title">Оплаты</h1>
          <p className="kb-muted">{now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button type="button" className="kb-btn" onClick={() => onPay()}>
          <Icon name="plus" /> Новая оплата
        </button>
      </header>

      <dl className="kb-totals">
        <div>
          <dt>Получено за месяц</dt>
          <dd>{rub(received)}</dd>
        </div>
        <div>
          <dt>Проведено на сумму</dt>
          <dd>{rub(earned)}</dd>
        </div>
        <div>
          <dt>Оплат в месяце</dt>
          <dd>{paid.length}</dd>
        </div>
      </dl>

      {renew.length > 0 && (
        <>
          <h2 className="kb-subhead">Пора продлить абонемент</h2>
          <ul className="kb-rows kb-rows--actions">
            {renew.map(({ s, left }) => (
              <li key={s.id}>
                <span>
                  <b>{s.name}</b> <BalanceBadge left={left} />
                </span>
                <button type="button" className="kb-btn kb-btn--ghost kb-btn--small" onClick={() => onPay(s.id)}>
                  Принять оплату
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="kb-subhead">Журнал</h2>
      <table className="kb-table">
        <thead>
          <tr>
            <th scope="col">Дата</th>
            <th scope="col">Ученик</th>
            <th scope="col">Пакет</th>
            <th scope="col" className="kb-num">
              Сумма
            </th>
          </tr>
        </thead>
        <tbody>
          {journal.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</td>
              <td>{name(p.studentId)}</td>
              <td>{lessonsWord(p.lessons)}</td>
              <td className="kb-num">{rub(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
