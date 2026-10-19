// Каталог магазина «Пион и мята»: вымышленные названия и цены для демонстрации.
export interface Product {
  id: string;
  img: string;
  name: string;
  price: number;
  sale?: boolean;
}

const P = (id: string, img: string, name: string, price: number, sale = false): Product => ({
  id,
  img,
  name,
  price,
  sale,
});

export const products: Product[] = [
  P('peony-sarah', 'b16', 'Пионы «Сара Бернар»', 12900),
  P('hundred-peonies', 'b15', 'Сто пионов', 24000),
  P('signature', 'b13', 'Пион и мята, фирменный', 11500),
  P('roses-statice', 'b01', 'Розовые розы и статица', 6900),
  P('lilac', 'b02', 'Роза и сирень в лиловом', 7400, true),
  P('white-kraft', 'b03', 'Белые пионы в крафте', 5200),
  P('morning', 'b04', 'Нежность утра', 6100),
  P('anemones', 'b05', 'Анемоны и ранункулюсы', 8300),
  P('eucalyptus', 'b06', 'Эвкалипт и кремовая роза', 6700),
  P('dahlias', 'b07', 'Георгины в пудре', 7900, true),
  P('powder', 'b08', 'Пудровый', 5600),
  P('eustoma', 'b09', 'Персиковая эустома', 5900),
  P('bordeaux', 'b10', 'Бордо и пудра', 9800),
  P('hydrangea-rose', 'b11', 'Гортензия и кустовая роза', 8900),
  P('tulips', 'b12', 'Белые тюльпаны', 3900),
  P('blue-hydrangea', 'b14', 'Голубая гортензия', 9400),
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

export const categories = [
  { img: 'b15', name: 'Пионы' },
  { img: 'b10', name: 'Розы' },
  { img: 'b03', name: 'Монобукеты' },
  { img: 'b11', name: 'Большие' },
  { img: 'b12', name: 'Тюльпаны' },
  { img: 'b14', name: 'Гортензии' },
];

export const gallery = [
  { img: 'b16', alt: 'Пионы «Сара Бернар» крупным планом' },
  { img: 'b15', alt: 'Букет пионов в руках' },
  { img: 'b13', alt: 'Упаковка букета в пудровой бумаге' },
  { img: 'b01', alt: 'Букет в белой бумаге, вид сверху' },
];

export const featured = byId('peony-sarah');

export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
