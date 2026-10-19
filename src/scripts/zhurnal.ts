// Журнал: полоса прогресса чтения, активный пункт оглавления, поиск по заголовкам.
export function initZhurnal() {
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const article = document.querySelector<HTMLElement>('[data-article]');
  if (progress && article) {
    const update = () => {
      const rect = article.getBoundingClientRect();
      const total = rect.height - innerHeight;
      const done = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      progress.style.transform = `scaleX(${done})`;
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }

  const toc = document.querySelector<HTMLElement>('[data-toc]');
  if (toc && article && 'IntersectionObserver' in window) {
    const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const headings = links.map((l) => document.getElementById(decodeURIComponent(l.hash.slice(1)))).filter(Boolean) as HTMLElement[];
    const mark = (id: string) =>
      links.forEach((l) => {
        if (decodeURIComponent(l.hash.slice(1)) === id) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) mark(e.target.id);
        });
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
  }

  const search = document.querySelector<HTMLElement>('[data-search]');
  if (search) {
    const input = search.querySelector<HTMLInputElement>('input')!;
    const items = [...search.querySelectorAll<HTMLElement>('[data-item]')];
    const empty = search.querySelector<HTMLElement>('[data-empty]')!;
    const count = search.querySelector<HTMLElement>('[data-count]')!;
    const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
    const apply = () => {
      const q = norm(input.value.trim());
      let shown = 0;
      items.forEach((item) => {
        const ok = !q || norm(item.dataset.item || '').includes(q);
        item.hidden = !ok;
        if (ok) shown++;
      });
      empty.hidden = shown > 0;
      count.textContent = q ? `Найдено: ${shown}` : `Всего материалов: ${items.length}`;
      const url = new URL(location.href);
      if (q) url.searchParams.set('q', input.value.trim());
      else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    };
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) input.value = initial;
    input.addEventListener('input', apply);
    apply();
    input.focus();
  }
}
