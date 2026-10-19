// Кейсы хаба в порядке показа: сетка на главной, коллаж первого экрана
// и переход «Следующий кейс» внизу каждой страницы кейса.
export interface CaseItem {
  href: string;
  kind: string;
  title: string;
  description: string;
  /** Имя файла превью в src/assets/previews без расширения */
  preview: string;
  size: 'wide' | 'half';
}

export const cases: CaseItem[] = [
  {
    href: '/cvety/',
    kind: 'Интернет-магазин',
    title: 'Магазин букетов с доставкой',
    description:
      'Мобильная витрина с каталогом, фильтром-шторкой, сборкой букета и оформлением заказа в четыре шага. Все экраны рабочие.',
    preview: 'cvety',
    size: 'wide',
  },
  {
    href: '/assistant/',
    kind: 'ИИ-консультант',
    title: 'Консультант в чате магазина',
    description: 'Чат на витрине отвечает по каталогу и правилам доставки, ведёт к корзине и передаёт сложные вопросы флористу.',
    preview: 'assistant',
    size: 'half',
  },
  {
    href: '/zhurnal/',
    kind: 'Онлайн-издание',
    title: 'Городской журнал',
    description: 'Издание о жизни города с двумя городами в одной редакции: лента, рубрики, статьи, авторы, поиск и разметка для поисковиков.',
    preview: 'zhurnal',
    size: 'half',
  },
  {
    href: '/before-after/',
    kind: 'Переработка сайта',
    title: 'Сайт клиники: было и стало',
    description: 'Тот же контент под одной шторкой: страница 2012 года и её сегодняшняя версия.',
    preview: 'before-after',
    size: 'half',
  },
  {
    href: '/speed-race/',
    kind: 'Ускорение загрузки',
    title: 'Гонка скорости',
    description: 'Две одинаковые страницы грузятся наперегонки: конструктор против аккуратной сборки.',
    preview: 'speed-race',
    size: 'half',
  },
  {
    href: '/forum-hero/',
    kind: 'Первый экран сайта',
    title: 'Сайт отраслевого форума',
    description: 'Анимированный первый экран с рельефом из частиц, который весит меньше одной фотографии.',
    preview: 'forum-hero',
    size: 'wide',
  },
];

/** Следующий кейс по кругу: после последнего снова первый */
export const nextCase = (href: string) => {
  const i = cases.findIndex((c) => c.href === href);
  return cases[(i + 1) % cases.length];
};
