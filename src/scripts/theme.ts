// Переключатель темы: хранит выбор в localStorage, иначе работает
// системная настройка через prefers-color-scheme.
export function initTheme() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');

  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  // Кнопка сообщает скринридеру, включена ли тёмная тема
  const sync = (button: HTMLButtonElement) => button.setAttribute('aria-pressed', String(current() === 'dark'));

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    sync(button);
    media.addEventListener('change', () => sync(button));
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      sync(button);
      try {
        localStorage.setItem('theme', next);
      } catch {
        // приватный режим: тема живёт до перезагрузки
      }
    });
  });
}
