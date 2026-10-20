// Кабинет репетитора: каркас с навигацией, переключатель роли и темы,
// общие окна занятия и оплаты. Экран и роль берутся из адреса, чтобы
// страница кейса могла открыть нужный вид во фрейме.
import { useEffect, useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import type { Lesson } from '../../scripts/kabinet/types';
import { Icon, type IconName } from './Icons';
import { LessonDialog } from './LessonDialog';
import { Parent } from './Parent';
import { PaymentDialog } from './PaymentDialog';
import { Payments } from './Payments';
import { Reports } from './Report';
import { SettingsDialog } from './Settings';
import { Students } from './Students';
import { Trials } from './Trials';
import { useKabinet } from './useKabinet';
import { Week } from './Week';

type View = 'week' | 'students' | 'payments' | 'trials' | 'report';
type Role = 'tutor' | 'parent';

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: 'week', label: 'Неделя', icon: 'week' },
  { id: 'students', label: 'Ученики', icon: 'students' },
  { id: 'payments', label: 'Оплаты', icon: 'payments' },
  { id: 'trials', label: 'Пробные', icon: 'trials' },
  { id: 'report', label: 'Отчёты', icon: 'report' },
];

// Родитель в демо один: мама Миши
const PARENT_OF = 'misha';

const fromUrl = () => {
  const p = new URLSearchParams(location.search);
  const view = NAV.some((n) => n.id === p.get('view')) ? (p.get('view') as View) : 'week';
  return { view, role: (p.get('role') === 'parent' ? 'parent' : 'tutor') as Role };
};

const currentTheme = () => (document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) as 'dark' | 'light';

export default function App() {
  const { state, busy, toast, run } = useKabinet();
  const [view, setView] = useState<View>('week');
  const [role, setRole] = useState<Role>('tutor');
  const [lesson, setLesson] = useState<{ l: Lesson; requestId?: string } | null>(null);
  const [paying, setPaying] = useState<{ studentId?: string } | null>(null);
  const [settings, setSettings] = useState(false);
  const [reportFor, setReportFor] = useState<string | undefined>();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const u = fromUrl();
    setView(u.view);
    setRole(u.role);
    setTheme(currentTheme());
    // Хаб и кабинет делят ключ темы: переключение на странице кейса
    // сразу меняет тему во фрейме
    const sync = (e: StorageEvent) => {
      if (e.key !== 'theme') return;
      if (e.newValue === 'dark' || e.newValue === 'light') document.documentElement.dataset.theme = e.newValue;
      else delete document.documentElement.dataset.theme;
      setTheme(currentTheme());
    };
    addEventListener('storage', sync);
    return () => removeEventListener('storage', sync);
  }, []);

  // Адрес повторяет экран и роль: ссылку можно отправить, назад работает
  const go = (next: Partial<{ view: View; role: Role }>) => {
    const v = next.view ?? view;
    const r = next.role ?? role;
    setView(v);
    setRole(r);
    const p = new URLSearchParams(location.search);
    p.set('view', v);
    if (r === 'parent') p.set('role', 'parent');
    else p.delete('role');
    history.replaceState(null, '', `?${p}`);
    document.getElementById('kb-main')?.focus({ preventScroll: true });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // тема просто не запомнится
    }
    setTheme(next);
  };

  if (!state) {
    return (
      <div className="kb-loading" role="status">
        Открываем тетрадь…
      </div>
    );
  }

  const openRequests = state.requests.filter((r) => r.status === 'open').length;

  return (
    <div className={`kb-app is-${role}`} aria-busy={busy}>
      <div className={busy ? 'kb-progress is-on' : 'kb-progress'} aria-hidden="true" />
      <header className="kb-top">
        <div className="kb-brand">
          <b>Тетрадь репетитора</b>
          <span className="kb-muted">
            {role === 'tutor' ? `${state.tutor.name}, ${state.tutor.subject}` : 'Кабинет родителя'}
          </span>
        </div>
        <div className="kb-role" role="group" aria-label="Кто смотрит">
          <button type="button" aria-pressed={role === 'tutor'} onClick={() => go({ role: 'tutor' })}>
            Репетитор
          </button>
          <button type="button" aria-pressed={role === 'parent'} onClick={() => go({ role: 'parent' })}>
            Родитель
          </button>
        </div>
        <div className="kb-top__tools">
          <button type="button" className="kb-iconbtn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button type="button" className="kb-iconbtn" onClick={() => setSettings(true)} aria-label="Правила и сброс демо">
            <Icon name="settings" />
          </button>
        </div>
      </header>

      {role === 'tutor' && (
        <nav className="kb-nav" aria-label="Разделы">
          {NAV.map((n) => (
            <button key={n.id} type="button" aria-current={view === n.id ? 'page' : undefined} onClick={() => go({ view: n.id })}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.id === 'week' && openRequests > 0 && (
                <i className="kb-dot" aria-label={`запросов: ${openRequests}`}>
                  {openRequests}
                </i>
              )}
            </button>
          ))}
        </nav>
      )}

      <main id="kb-main" className="kb-main" tabIndex={-1}>
        {role === 'parent' ? (
          <Parent state={state} studentId={PARENT_OF} busy={busy} run={run} />
        ) : view === 'week' ? (
          <Week state={state} onOpenLesson={(l, requestId) => setLesson({ l, requestId })} />
        ) : view === 'students' ? (
          <Students
            state={state}
            onPay={(id) => setPaying({ studentId: id })}
            onReport={(id) => {
              setReportFor(id);
              go({ view: 'report' });
            }}
            onOpenLesson={(l) => setLesson({ l })}
          />
        ) : view === 'payments' ? (
          <Payments state={state} onPay={(id) => setPaying({ studentId: id })} />
        ) : view === 'trials' ? (
          <Trials state={state} busy={busy} run={run} />
        ) : (
          <Reports key={reportFor} state={state} initialStudent={reportFor} />
        )}
      </main>

      {lesson && <LessonDialog state={state} lesson={state.lessons.find((x) => x.id === lesson.l.id) ?? lesson.l} requestId={lesson.requestId} busy={busy} run={run} onClose={() => setLesson(null)} />}
      {paying && <PaymentDialog state={state} studentId={paying.studentId} busy={busy} run={run} onClose={() => setPaying(null)} />}
      {settings && (
        <SettingsDialog
          state={state}
          busy={busy}
          run={run}
          onClose={() => setSettings(false)}
          onReset={async () => {
            if (await run(() => api.reset(), 'Демо сброшено к началу')) setSettings(false);
          }}
        />
      )}

      <div className="kb-toast-wrap" aria-live="polite">
        {toast && (
          <p key={toast.id} className={`kb-toast is-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : undefined}>
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}
