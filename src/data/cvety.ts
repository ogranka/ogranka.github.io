// Каталог магазина «Пион и мята»: вымышленные названия и цены для демонстрации.
export interface Product {
  id: string;
  img: string;
  name: string;
  price: number;
  /** Состав для карточки, совпадает с базой знаний консультанта */
  text: string;
  /** Цветы для фильтра, названия как на кнопках шторки */
  flowers: string[];
  /** Оттенки для фильтра, как подписи кружков шторки */
  tones: string[];
  /** Высота и диаметр, см */
  size: [string, string];
  sale?: boolean;
  /** Монобукет: один вид цветов, зелень не в счёт */
  mono?: boolean;
  /** Большой букет собирают по предзаказу, сегодня его не привезти */
  preorder?: boolean;
}

export const FLOWERS = ['Пионы', 'Розы', 'Гортензии', 'Тюльпаны', 'Эустома', 'Анемоны', 'Эвкалипт', 'Георгины'];
export const TONES = [
  { name: 'Белый', color: '#ffffff' },
  { name: 'Розовый', color: '#f6a9c0' },
  { name: 'Сиреневый', color: '#b7a6dc' },
  { name: 'Голубой', color: '#a9c8ea' },
  { name: 'Персиковый', color: '#f5b48f' },
  { name: 'Бордовый', color: '#8a2a44' },
  { name: 'Разноцветный', color: 'conic-gradient(#f6a9c0,#f5b48f,#f3d36b,#a9c8ea,#b7a6dc,#f6a9c0)' },
];

export const products: Product[] = [
  { id: 'peony-sarah', img: 'b16', name: 'Пионы «Сара Бернар»', price: 12900, text: 'Пионы «Сара Бернар» 15 шт, веточки мяты и эвкалипта, пудровая бумага, аквабокс.', flowers: ['Пионы', 'Эвкалипт'], tones: ['Розовый'], size: ['45–50', '40'], mono: true },
  { id: 'hundred-peonies', img: 'b15', name: 'Сто пионов', price: 24000, text: '100 розовых пионов, крафт, аквабокс. Большой букет, собираем по предзаказу за день.', flowers: ['Пионы'], tones: ['Розовый'], size: ['60–70', '70'], mono: true, preorder: true },
  { id: 'signature', img: 'b13', name: 'Пион и мята, фирменный', price: 11500, text: '9 пионов, 5 кустовых роз, мята, эвкалипт, пудровая бумага с лентой.', flowers: ['Пионы', 'Розы', 'Эвкалипт'], tones: ['Розовый', 'Белый'], size: ['45', '35'] },
  { id: 'roses-statice', img: 'b01', name: 'Розовые розы и статица', price: 6900, text: '11 розовых роз, статица, белая бумага.', flowers: ['Розы'], tones: ['Розовый'], size: ['40', '35'] },
  { id: 'lilac', img: 'b02', name: 'Роза и сирень в лиловом', price: 7400, text: '7 роз, сирень, лиловая бумага.', flowers: ['Розы'], tones: ['Розовый', 'Сиреневый'], size: ['45', '30'], sale: true },
  { id: 'white-kraft', img: 'b03', name: 'Белые пионы в крафте', price: 5200, text: '5 белых пионов, крафт.', flowers: ['Пионы'], tones: ['Белый'], size: ['40', '25'], mono: true },
  { id: 'morning', img: 'b04', name: 'Нежность утра', price: 6100, text: 'Кустовая роза, эустома, ромашка, пудровая бумага.', flowers: ['Розы', 'Эустома'], tones: ['Персиковый', 'Белый'], size: ['40', '25'] },
  { id: 'anemones', img: 'b05', name: 'Анемоны и ранункулюсы', price: 8300, text: 'Анемоны, ранункулюсы, персиковая бумага.', flowers: ['Анемоны'], tones: ['Разноцветный'], size: ['40', '35'] },
  { id: 'eucalyptus', img: 'b06', name: 'Эвкалипт и кремовая роза', price: 6700, text: '9 кремовых роз, эвкалипт, бежевая бумага.', flowers: ['Розы', 'Эвкалипт'], tones: ['Белый', 'Персиковый'], size: ['45', '30'] },
  { id: 'dahlias', img: 'b07', name: 'Георгины в пудре', price: 7900, text: 'Георгины, кустовая хризантема, пудровая бумага.', flowers: ['Георгины'], tones: ['Розовый', 'Сиреневый'], size: ['45', '35'], sale: true },
  { id: 'powder', img: 'b08', name: 'Пудровый', price: 5600, text: 'Кустовая роза, гипсофила, пудровая бумага.', flowers: ['Розы'], tones: ['Розовый'], size: ['40', '25'] },
  { id: 'eustoma', img: 'b09', name: 'Персиковая эустома', price: 5900, text: 'Эустома, кустовая роза, белая бумага.', flowers: ['Эустома', 'Розы'], tones: ['Персиковый', 'Белый'], size: ['40', '25'] },
  { id: 'bordeaux', img: 'b10', name: 'Бордо и пудра', price: 9800, text: 'Бордовые и розовые розы, эвкалипт, крафт.', flowers: ['Розы', 'Эвкалипт'], tones: ['Бордовый', 'Розовый'], size: ['50', '40'] },
  { id: 'hydrangea-rose', img: 'b11', name: 'Гортензия и кустовая роза', price: 8900, text: '3 гортензии, кустовая роза, крафт.', flowers: ['Гортензии', 'Розы'], tones: ['Белый', 'Голубой'], size: ['45', '35'] },
  { id: 'tulips', img: 'b12', name: 'Белые тюльпаны', price: 3900, text: '25 белых тюльпанов, розовая бумага, лента.', flowers: ['Тюльпаны'], tones: ['Белый'], size: ['40', '25'], mono: true },
  { id: 'blue-hydrangea', img: 'b14', name: 'Голубая гортензия', price: 9400, text: 'Голубая и розовая гортензия, эвкалипт, пудровая бумага.', flowers: ['Гортензии', 'Эвкалипт'], tones: ['Голубой', 'Розовый'], size: ['45', '40'] },
];

const byId = (id: string) => products.find((p) => p.id === id)!;

export const lists = {
  season: ['peony-sarah', 'signature', 'anemones', 'tulips'].map(byId),
  catalog: products,
  upsell: ['white-kraft', 'eustoma', 'tulips', 'powder', 'morning'].map(byId),
};

export const hero = [
  { img: 'b15', title: 'Сезон пионов открыт', alt: 'Большой букет розовых пионов в руках' },
  { img: 'b12', title: 'Тюльпаны к утру', alt: 'Белые тюльпаны в розовой бумаге' },
  { img: 'b14', title: 'Гортензии на каждый день', alt: 'Букет с голубой и розовой гортензией' },
];

// preset: готовый набор фильтра каталога, см. PRESETS в scripts/cvety-shop.ts
export const categories = [
  { img: 'b15', name: 'Пионы', preset: 'peonies' },
  { img: 'b10', name: 'Розы', preset: 'roses' },
  { img: 'b03', name: 'Монобукеты', preset: 'mono' },
  { img: 'b11', name: 'Большие', preset: 'big' },
  { img: 'b12', name: 'Тюльпаны', preset: 'tulips' },
  { img: 'b14', name: 'Гортензии', preset: 'hydrangeas' },
];

export const gallery = [
  { img: 'b16', alt: 'Пионы «Сара Бернар» крупным планом' },
  { img: 'b15', alt: 'Букет пионов в руках' },
  { img: 'b13', alt: 'Упаковка букета в пудровой бумаге' },
  { img: 'b01', alt: 'Букет в белой бумаге, вид сверху' },
];

export const featured = byId('peony-sarah');

export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
