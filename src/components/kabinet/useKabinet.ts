// Состояние кабинета: грузит данные из имитации сервера, выполняет действия,
// показывает загрузку и человеческие сообщения об успехе и ошибках.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../scripts/kabinet/api';
import type { KabinetState } from '../../scripts/kabinet/types';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

export function useKabinet() {
  const [state, setState] = useState<KabinetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef(0);

  const say = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    setToast({ id: Date.now(), text, kind });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    api.load().then(setState);
  }, []);

  // Выполнить действие: true при успехе, false при ошибке (текст уже показан)
  const run = useCallback(
    async (action: () => Promise<KabinetState>, success?: string) => {
      setBusy(true);
      try {
        setState(await action());
        if (success) say(success);
        return true;
      } catch (err) {
        say(err instanceof ApiError ? err.message : 'Не получилось сохранить, попробуйте ещё раз', 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [say],
  );

  return { state, busy, toast, run, say };
}
