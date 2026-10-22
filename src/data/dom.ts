// Лендинг «Линия дома»: вымышленная мастерская каркасных домов. Проекты,
// этапы, состав цены, вопросы и формула квиза в одном месте: цена «от» у
// проектов считается той же формулой, что и в квизе, поэтому цифры сходятся.

export type Floors = 'one' | 'attic' | 'two';
export type Foundation = 'screw' | 'rc' | 'slab';
export type Finish = 'shell' | 'prefinish' | 'turnkey';
export type Pace = 'normal' | 'fast';

export interface QuizAnswers {
  area: number;
  floors: Floors;
  foundation: Foundation;
  finish: Finish;
  pace: Pace;
}

// Цена квадратного метра по комплектации, ₽
export const FINISH: Record<Finish, { label: string; hint: string; rate: number; weeks: number }> = {
  shell: { label: 'Тёплый контур', hint: 'Каркас, утепление, кровля, окна и наружная отделка. Внутри черновые стены.', rate: 38_000, weeks: 0 },
  prefinish: { label: 'Под чистовую', hint: 'Плюс разводка электрики, воды и отопления, черновые полы и стены под покраску.', rate: 52_000, weeks: 6 },
  turnkey: { label: 'Под ключ', hint: 'Плюс чистовая отделка, сантехника, двери и лестница. Заезжаете с мебелью.', rate: 68_000, weeks: 10 },
};

export const FOUNDATION: Record<Foundation, { label: string; hint: string; price: number }> = {
  screw: { label: 'Винтовые сваи', hint: 'Быстро и недорого, подходит для большинства участков.', price: 450_000 },
  rc: { label: 'Железобетонные сваи', hint: 'Для слабых и пучинистых грунтов, на десятилетия.', price: 650_000 },
  slab: { label: 'Утеплённая плита', hint: 'Тёплый пол прямо в плите, ровное основание без подвала.', price: 1_100_000 },
};

// Коэффициент цены метра: второй этаж дешевле на метр, чем первый, за счёт
// общей кровли и фундамента
export const FLOORS: Record<Floors, { label: string; hint: string; k: number }> = {
  one: { label: 'Один этаж', hint: 'Всё на одном уровне, без лестницы.', k: 1 },
  attic: { label: 'С мансардой', hint: 'Спальни под скатами крыши.', k: 0.95 },
  two: { label: 'Два этажа', hint: 'Больше площади на том же участке.', k: 0.92 },
};

export const PACE: Record<Pace, { label: string; hint: string; k: number; weeksK: number }> = {
  normal: { label: 'Обычный срок', hint: 'Одна бригада, без ночных смен.', k: 1, weeksK: 1 },
  fast: { label: 'Быстрее на треть', hint: 'Две бригады параллельно.', k: 1.08, weeksK: 0.67 },
};

export const AREA = { min: 60, max: 250, step: 5, initial: 120 };

export interface Estimate {
  low: number;
  high: number;
  weeks: number;
  lines: { label: string; value: number }[];
}

// Смета: метры по комплектации с поправкой на этажность, плюс фундамент,
// всё умножено на срок. Диапазон ±6%: итог зависит от участка и окон.
export function estimate(a: QuizAnswers): Estimate {
  const house = Math.round(a.area * FINISH[a.finish].rate * FLOORS[a.floors].k * PACE[a.pace].k);
  const foundation = Math.round(FOUNDATION[a.foundation].price * PACE[a.pace].k);
  const total = house + foundation;
  const weeks = Math.round((10 + a.area / 15 + FINISH[a.finish].weeks) * PACE[a.pace].weeksK);
  const round = (n: number) => Math.round(n / 50_000) * 50_000;
  return {
    low: round(total * 0.94),
    high: round(total * 1.06),
    weeks,
    lines: [
      { label: `Дом ${a.area} м², ${FINISH[a.finish].label.toLowerCase()}`, value: house },
      { label: FOUNDATION[a.foundation].label, value: foundation },
    ],
  };
}

export const projects = [
  { id: 'shale', name: 'Шале 96', photo: 'shale', area: 96, floors: 'attic', foundation: 'screw', note: 'Треугольный дом с террасой и вторым светом в гостиной', alt: 'Деревянный дом с треугольной крышей и террасой среди сосен' },
  { id: 'barn', name: 'Барн 120', photo: 'barn', area: 120, floors: 'one', foundation: 'screw', note: 'Одноэтажный дом под двускатной крышей, всё на одном уровне', alt: 'Тёмный одноэтажный дом под двускатной крышей у воды' },
  { id: 'les', name: 'Лесной 150', photo: 'les', area: 150, floors: 'two', foundation: 'screw', note: 'Два этажа и высокие окна, кабинет и три спальни наверху', alt: 'Двухэтажный дом с деревянным фасадом в сосновом лесу' },
  { id: 'modul', name: 'Модуль 180', photo: 'modul', area: 180, floors: 'two', foundation: 'rc', note: 'Плоская кровля и навес на сваях вместо гаража', alt: 'Современный дом с плоской крышей на сваях' },
] as const;

// Цена «от» и срок проекта: тёплый контур в обычный срок
export const projectFrom = (p: (typeof projects)[number]) => estimate({ area: p.area, floors: p.floors, foundation: p.foundation, finish: 'shell', pace: 'normal' });

export const steps = [
  { title: 'Выезд на участок', time: '1 день', text: 'Смотрим участок, подъезды и соседей, берём пробы грунта. Бесплатно в пределах 50 км от города.' },
  { title: 'Проект и смета', time: '2–3 недели', text: 'Планировка под вашу семью, фасады и смета по пунктам. Цена фиксируется в договоре и не растёт.' },
  { title: 'Фундамент', time: '1–2 недели', text: 'Сваи или плита по результатам грунта. Фотоотчёт после каждого дня работ.' },
  { title: 'Каркас и кровля', time: '3–5 недель', text: 'Доска камерной сушки, утепление 200 мм, мембраны и кровля. Дом закрыт от погоды.' },
  { title: 'Инженерия и окна', time: '2–4 недели', text: 'Электрика, вода, отопление и вентиляция по проекту, окна с тёплым монтажом.' },
  { title: 'Отделка и ключи', time: 'по комплектации', text: 'Отделка по выбранной комплектации, уборка и приёмка по чек-листу. Отдаём ключи и документы.' },
];

export const priceTable = {
  included: ['Проект и смета', 'Фундамент по выбору', 'Каркас из доски камерной сушки', 'Утепление 200 мм и мембраны', 'Кровля и водосток', 'Окна с тёплым монтажом', 'Наружная отделка', 'Вывоз мусора и уборка'],
  extra: ['Подключение электричества от столба', 'Скважина и септик', 'Мебель и бытовая техника', 'Дорожки, забор и ландшафт'],
};

export const faq = [
  { q: 'Строите зимой?', a: 'Да. Каркас собирается из сухой доски, ему не нужно время на усадку, как брусу. Зимой строим так же, только фундамент под плиту заливаем с подогревом.' },
  { q: 'Можно ли изменить проект?', a: 'Любой проект меняем под участок и семью: переносим стены, добавляем окна и террасу. Если менять почти всё, делаем свой проект с нуля.' },
  { q: 'Подходит ли для ипотеки?', a: 'Готовим смету и договор в виде, который принимают банки для семейной и сельской ипотеки, и подсказываем, какие документы собрать.' },
  { q: 'Что с гарантией?', a: 'Пять лет на каркас и кровлю, два года на инженерию и отделку. Всё прописано в договоре.' },
  { q: 'Можно приехать на стройку?', a: 'В любой день с прорабом. А каждый вечер присылаем фото и короткий отчёт в мессенджер.' },
];

// Неразрывные пробелы: число и знак рубля не разрываются по строкам
export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, '\u00a0') + '\u00a0₽';
export const mln = (n: number) => (n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '\u00a0млн\u00a0₽';
