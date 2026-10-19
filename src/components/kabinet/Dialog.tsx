// Модальное окно на нативном <dialog>: фокус внутри, Esc закрывает,
// фон недоступен. Открыто, пока компонент смонтирован.
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icons';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Dialog({ title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    d.showModal();
    return () => {
      d.close();
      back?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'kb-dialog kb-dialog--wide' : 'kb-dialog'}
      aria-labelledby="kb-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="kb-dialog__inner">
        <header className="kb-dialog__head">
          <h2 id="kb-dialog-title">{title}</h2>
          <button type="button" className="kb-iconbtn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
