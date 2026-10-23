// Появление блоков при скролле без библиотек: IntersectionObserver.
// Прячем и потом показываем только блоки ниже сгиба: всё, что при загрузке
// уже в первом экране, стоит сразу. При reduced-motion и без поддержки
// ничего не прячем.
export function initReveal() {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!items.length) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );

  const fold = window.innerHeight;
  items.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add('is-pending');
    observer.observe(el);
  });
}
