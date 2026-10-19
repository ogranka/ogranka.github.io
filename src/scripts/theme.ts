// Переключатель темы: хранит выбор в localStorage, иначе работает
// системная настройка через prefers-color-scheme.
export function initTheme() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');

  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {
        // приватный режим: тема живёт до перезагрузки
      }
    });
  });
}
