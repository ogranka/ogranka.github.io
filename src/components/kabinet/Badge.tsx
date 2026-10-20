// Остаток абонемента: долг, последнее занятие или спокойный счёт.
import { lessonsWord } from '../../scripts/kabinet/format';

export function BalanceBadge({ left }: { left: number }) {
  if (left < 0) return <span className="kb-badge kb-badge--bad">долг {lessonsWord(-left)}</span>;
  if (left === 0) return <span className="kb-badge kb-badge--bad">0 занятий</span>;
  if (left === 1) return <span className="kb-badge kb-badge--warn">осталось 1</span>;
  return <span className="kb-badge">{lessonsWord(left)}</span>;
}
