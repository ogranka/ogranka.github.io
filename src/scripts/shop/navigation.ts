// Экраны по адресу: #home, #catalog, #product/<id>, #checkout. У экранов нет
// таких id нарочно: иначе браузер прокручивал бы к якорю родительскую страницу,
// когда магазин открыт во фрейме. Начальный экран можно задать ?s=catalog.

export interface Route {
  screen: string;
  arg?: string;
}

export function initNavigation(screens: HTMLElement[], initial: string, onShow: (route: Route) => void) {
  // Во фрейме на странице кейса история браузера общая с родителем. Переходы
  // внутри магазина заменяют запись, а не добавляют её, иначе «Назад» в браузере
  // листал бы экраны телефона вместо ухода со страницы.
  const inFrame = window.top !== window;
  const go = (hash: string) => {
    if (inFrame) location.replace(hash);
    else location.hash = hash;
  };
  if (inFrame) {
    document.addEventListener(
      'click',
      (e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        const href = a?.getAttribute('href');
        if (!a || !href || href === '#') return;
        e.preventDefault();
        go(href);
      },
      true,
    );
  }

  // Полный адрес прошлого экрана, вместе с id букета: «Назад» из оформления
  // возвращает к той карточке, с которой пришли
  let current = '';
  let previous = '';

  const show = () => {
    const raw = location.hash ? location.hash.slice(1) : initial || 'home';
    const [id, arg] = raw.split('/');
    const target = screens.find((s) => s.dataset.screen === id) || screens[0];
    const screen = target.dataset.screen!;
    const full = arg && screen === id ? `${screen}/${arg}` : screen;
    if (full !== current) {
      if (current.split('/')[0] !== screen) previous = current;
      current = full;
    }
    screens.forEach((s) => (s.hidden = s !== target));
    onShow({ screen, arg: screen === id ? arg : undefined });
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', show);

  return {
    go,
    show,
    previous: () => previous,
  };
}
