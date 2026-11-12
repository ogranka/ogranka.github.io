// Избранное: id букетов. Все сердечки одного букета (на главной, в каталоге,
// в карточке) показывают одно состояние, в каталоге список открывает подборка
// «Избранное».
import { $$, store } from './dom';

const KEY = 'pm:fav';

export type Favorites = ReturnType<typeof createFavorites>;

export function createFavorites(onChange: () => void) {
  const ids = new Set<string>(store.get<string[]>(KEY, []));

  const sync = () => {
    $$('[data-like]').forEach((b) => b.setAttribute('aria-pressed', String(ids.has(b.dataset.like || ''))));
    $$('[data-fav-count]').forEach((el) => {
      el.textContent = String(ids.size);
      el.hidden = ids.size === 0;
    });
  };

  return {
    has: (id: string) => ids.has(id),
    size: () => ids.size,
    sync,
    // Возвращает новое состояние: true, если букет теперь в избранном
    toggle(id: string) {
      const on = !ids.has(id);
      if (on) ids.add(id);
      else ids.delete(id);
      store.set(KEY, [...ids]);
      sync();
      onChange();
      return on;
    },
  };
}
