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
  /** Приём, а не проект: на главной идёт компактным рядом «Отдельные приёмы» */
  technique?: boolean;
}

export const cases: CaseItem[] = [
  {
    href: '/cvety/',
    kind: 'Интернет-магазин',
    title: 'Магазин букетов с доставкой',
    description:
      'Витрина для телефона: каталог, фильтр, сборка букета и заказ в четыре шага. Всё нажимается.',
    preview: 'cvety',
    size: 'wide',
  },
  {
    href: '/kabinet/',
    kind: 'Личный кабинет',
    title: 'Кабинет репетитора',
    description: 'Неделя занятий, абонементы, оплаты и отчёты родителям. Остаток занятий кабинет считает сам.',
    preview: 'kabinet',
    size: 'half',
  },
  {
    href: '/mini-app/',
    kind: 'Telegram Mini App',
    title: 'Запись в барбершоп в Telegram',
    description: 'Запись в Telegram за минуту: мастер и время, бот пришлёт подтверждение и напоминание.',
    preview: 'mini-app',
    size: 'half',
  },
  {
    href: '/dom/',
    kind: 'Лендинг',
    title: 'Лендинг строительной компании',
    description: 'Чертёж на первом экране собирается в дом, дальше проекты, этапы и квиз с расчётом цены.',
    preview: 'dom',
    size: 'half',
  },
  {
    href: '/assistant/',
    kind: 'ИИ-консультант',
    title: 'Консультант в чате магазина',
    description: 'Чат на витрине отвечает по каталогу и доставке, а сложные вопросы передаёт флористу.',
    preview: 'assistant',
    size: 'half',
  },
  {
    href: '/zhurnal/',
    kind: 'Онлайн-издание',
    title: 'Городской журнал',
    description: 'Городское издание на два города: лента, рубрики, статьи, авторы и поиск.',
    preview: 'zhurnal',
    size: 'wide',
  },
  {
    href: '/before-after/',
    kind: 'Переработка сайта',
    title: 'Сайт клиники: было и стало',
    description: 'Тот же контент под одной шторкой: страница 2012 года и её сегодняшняя версия.',
    preview: 'before-after',
    size: 'half',
    technique: true,
  },
  {
    href: '/speed-race/',
    kind: 'Ускорение загрузки',
    title: 'Гонка скорости',
    description: 'Две одинаковые страницы грузятся наперегонки: конструктор против аккуратной сборки.',
    preview: 'speed-race',
    size: 'half',
    technique: true,
  },
  {
    href: '/forum-hero/',
    kind: 'Первый экран сайта',
    title: 'Сайт отраслевого форума',
    description: 'Анимированный первый экран с рельефом из частиц, который весит меньше одной фотографии.',
    preview: 'forum-hero',
    size: 'half',
    technique: true,
  },
];

/** Следующий кейс по кругу: после последнего снова первый */
export const nextCase = (href: string) => {
  const i = cases.findIndex((c) => c.href === href);
  return cases[(i + 1) % cases.length];
};
