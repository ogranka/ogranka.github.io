// Справочники журнала «Окрестности»: города, рубрики, авторы. Всё вымышленное.
export const edition = {
  name: 'Окрестности',
  domain: 'okrestnosti.example',
  tagline: 'Журнал о жизни города',
};

export interface City {
  slug: string;
  name: string;
  genitive: string;
  prepositional: string;
  tagline: string;
}

export const cities: City[] = [
  {
    slug: 'srednegorsk',
    name: 'Среднегорск',
    genitive: 'Среднегорска',
    prepositional: 'Среднегорске',
    tagline: 'Город на двух берегах: трамвай, горы по утрам и пекарни у колец',
  },
  {
    slug: 'olkhovsk',
    name: 'Ольховск',
    genitive: 'Ольховска',
    prepositional: 'Ольховске',
    tagline: 'Речной город с длинной набережной, ярмарками и велодорожкой вдоль воды',
  },
];

export const rubrics = [
  { slug: 'mesta', name: 'Места', about: 'Дворы, залы, набережные и всё, куда стоит дойти' },
  { slug: 'eda', name: 'Еда', about: 'Пекарни, рынки, столовые и кто за прилавком' },
  { slug: 'marshruty', name: 'Маршруты', about: 'Прогулки на час, на день и на велосипед' },
  { slug: 'sobytiya', name: 'События', about: 'Ярмарки, фестивали и что происходит на этой неделе' },
  { slug: 'lyudi', name: 'Люди', about: 'Разговоры с теми, кто делает город' },
];

export const authors = [
  {
    slug: 'marina-sokolova',
    name: 'Марина Соколова',
    role: 'Редактор города',
    about: 'Ведёт Среднегорск с первого выпуска. Пишет о местах и людях, ездит по городу на трамвае и знает всех вагоновожатых по именам.',
  },
  {
    slug: 'ilya-vetrov',
    name: 'Илья Ветров',
    role: 'Корреспондент',
    about: 'Еда и рынки в обоих городах. Считает, что о городе честнее всего рассказывает очередь в пекарню.',
  },
  {
    slug: 'dasha-orlova',
    name: 'Даша Орлова',
    role: 'Автор маршрутов',
    about: 'Ходит пешком и ездит на велосипеде. Все маршруты в журнале проверены ногами, с таймингом и запасной кофейней.',
  },
  {
    slug: 'pavel-lipin',
    name: 'Павел Липин',
    role: 'Редактор Ольховска',
    about: 'Собирает выпуски Ольховска, пишет о событиях и набережной. Ведёт рубрику «События» и календарь ярмарок.',
  },
];

export const bySlug = <T extends { slug: string }>(list: T[], slug: string) => list.find((i) => i.slug === slug)!;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export const readingTime = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 180));
