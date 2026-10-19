// Настройки правил: срок бесплатной отмены. Остальное в рабочей версии.
import { useState } from 'react';
import { api } from '../../scripts/kabinet/api';
import type { KabinetState } from '../../scripts/kabinet/types';
import { Dialog } from './Dialog';

interface Props {
  state: KabinetState;
  busy: boolean;
  run: (action: () => Promise<KabinetState>, success?: string) => Promise<boolean>;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsDialog({ state, busy, run, onReset, onClose }: Props) {
  const [hours, setHours] = useState(state.settings.freeCancelHours);
  return (
    <Dialog title="Правила кабинета" onClose={onClose}>
      <form
        className="kb-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.setFreeCancelHours(hours), `Бесплатная отмена теперь за ${hours} ч`)) onClose();
        }}
      >
        <label className="kb-field">
          <span>Бесплатная отмена, часов до начала</span>
          <input type="number" min={0} max={72} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-describedby="kb-hours-hint" />
        </label>
        <p id="kb-hours-hint" className="kb-hint">
          Отмена позже этого срока списывает занятие из абонемента. Правило видно в окне отмены и в отчёте родителям.
        </p>
        <button type="submit" className="kb-btn" disabled={busy}>
          Сохранить
        </button>
      </form>
      <div className="kb-dialog__foot">
        <p className="kb-hint">Демо хранит данные в этом браузере. Сброс вернёт учеников, неделю и оплаты к началу.</p>
        <button type="button" className="kb-btn kb-btn--ghost" disabled={busy} onClick={onReset}>
          Сбросить демо
        </button>
      </div>
    </Dialog>
  );
}
