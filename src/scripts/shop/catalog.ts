// Каталог: фильтр в шторке, подборки, сортировка и поиск. Работает по
// настоящим карточкам сетки, данные букетов берёт из каталога сайта.
import { products, rub, type Product } from '../../data/cvety';
import { productById } from './cart';
import { $, $$, bouquets, must } from './dom';

export interface Filter {
  min: number;
  max: number;
  sale: boolean;
  today: boolean;
  mono: boolean;
  flowers: string[];
  tones: string[];
}

const EMPTY: Filter = { min: 0, max: Infinity, sale: false, today: false, mono: false, flowers: [], tones: [] };

// Подборки: кнопки над каталогом, кружки на главной, «Часто ищут» в поиске
const PRESETS: Record<string, Partial<Filter>> = {
  all: {},
  mono: { mono: true },
  under6: { max: 6000 },
  under10: { max: 10000 },
  big: { min: 10000 },
  eucalyptus: { flowers: ['Эвкалипт'] },
  peonies: { flowers: ['Пионы'] },
  roses: { flowers: ['Розы'] },
  tulips: { flowers: ['Тюльпаны'] },
  hydrangeas: { flowers: ['Гортензии'] },
};

const SORT_LABELS: Record<string, string> = { popular: 'Популярные', cheap: 'Дешевле', dear: 'Дороже', new: 'Новинки' };

// Внутри группы условия складываются через «или», между группами через «и»
const matches = (p: Product, f: Filter) =>
  p.price >= f.min &&
  p.price <= f.max &&
  (!f.sale || !!p.sale) &&
  (!f.today || !p.preorder) &&
  (!f.mono || !!p.mono) &&
  (!f.flowers.length || f.flowers.some((x) => p.flowers.includes(x))) &&
  (!f.tones.length || f.tones.some((x) => p.tones.includes(x)));

const activeCount = (f: Filter) =>
  [f.min > 0 || f.max !== Infinity, f.sale, f.today, f.mono, f.flowers.length > 0, f.tones.length > 0].filter(Boolean).length;

// Поиск по названию, составу и цветам. «Пионы» находит и «пион».
const search = (q: string) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return products.filter((p) => {
    const hay = `${p.name} ${p.text} ${p.flowers.join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w.length > 4 ? w.slice(0, -1) : w));
  });
};

const parseNum = (v: string) => Number(v.replace(/\D/g, '')) || 0;

// body: тело шторки, куда клонируются шаблоны фильтра, сортировки и поиска
export function initCatalog(body: HTMLElement) {
  const grid = must('#catalogGrid');
  const cards = $$('.pcard', grid);
  const order = new Map(cards.map((c, i) => [c, i]));
  const filter: Filter = { ...EMPTY };
  // Флаг «монобукеты» ставит только подборка, в шторке его нет: храним
  // отдельно, чтобы «Сбросить» в шторке снимал и его
  let draftMono = false;
  let sortMode = 'popular';

  const pressed = (attr: string) => $$(`[data-${attr}][aria-pressed="true"]`, body).map((b) => b.dataset[attr]!);
  const input = (name: string) => $<HTMLInputElement>(`input[name=${name}]`, body);

  const readDraft = (): Filter => {
    const min = input('min');
    const max = input('max');
    return {
      min: min ? parseNum(min.value) : 0,
      max: max && parseNum(max.value) ? parseNum(max.value) : Infinity,
      sale: !!input('sale')?.checked,
      today: !!input('today')?.checked,
      mono: draftMono,
      flowers: pressed('flower'),
      tones: pressed('tone'),
    };
  };

  // Шторка открылась: выставить в ней текущий фильтр
  const restoreDraft = () => {
    draftMono = filter.mono;
    must<HTMLInputElement>('input[name=sale]', body).checked = filter.sale;
    must<HTMLInputElement>('input[name=today]', body).checked = filter.today;
    must<HTMLInputElement>('input[name=min]', body).value = filter.min ? filter.min.toLocaleString('ru-RU') : '';
    must<HTMLInputElement>('input[name=max]', body).value = filter.max !== Infinity ? filter.max.toLocaleString('ru-RU') : '';
    $$('[data-flower]', body).forEach((b) => b.setAttribute('aria-pressed', String(filter.flowers.includes(b.dataset.flower!))));
    $$('[data-tone]', body).forEach((b) => b.setAttribute('aria-pressed', String(filter.tones.includes(b.dataset.tone!))));
    updateDraftCount();
  };

  const resetDraft = () => {
    draftMono = false;
    $$('[aria-pressed]', body).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $$<HTMLInputElement>('input[type=checkbox]', body).forEach((c) => (c.checked = false));
    $$<HTMLInputElement>('input[name=min], input[name=max]', body).forEach((i) => (i.value = ''));
    updateDraftCount();
  };

  // Сколько букетов покажет кнопка «Показать», пока фильтр ещё не применён
  const updateDraftCount = () => {
    const el = $('[data-apply-count]', body);
    if (!el) return;
    const f = readDraft();
    el.textContent = bouquets(products.filter((p) => matches(p, f)).length);
  };

  const apply = (next: Filter, preset = '') => {
    Object.assign(filter, next);
    let n = 0;
    cards.forEach((c) => {
      const ok = matches(productById(c.dataset.id!)!, filter);
      c.hidden = !ok;
      if (ok) n++;
    });
    must('#catalogEmpty').hidden = n > 0;
    must('#catalogCount').textContent = bouquets(n);
    const active = activeCount(filter);
    const badge = must('#filterCount');
    badge.textContent = String(active);
    badge.hidden = active === 0;
    const chip = preset || (active ? '' : 'all');
    $$('.chips [data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === chip)));
  };

  const applyDraft = () => apply(readDraft());
  const applyPreset = (key: string) => apply({ ...EMPTY, ...PRESETS[key] }, key);

  const sort = (mode: string) => {
    sortMode = mode;
    const sorted = [...cards].sort((a, b) => {
      const pa = Number(a.dataset.price);
      const pb = Number(b.dataset.price);
      if (mode === 'cheap') return pa - pb;
      if (mode === 'dear') return pb - pa;
      if (mode === 'new') return order.get(b)! - order.get(a)!;
      return order.get(a)! - order.get(b)!;
    });
    sorted.forEach((c) => grid.append(c));
    must('#sortBtn').firstChild!.textContent = SORT_LABELS[mode];
  };

  const showSortChoice = () => $$('[data-sort]', body).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === sortMode)));

  const renderResults = (q: string) => {
    const list = $('[data-results]', body);
    const none = $('[data-noresults]', body);
    if (!list || !none) return;
    const found = search(q);
    list.innerHTML = found
      .slice(0, 8)
      .map((p) => `<li><a href="#product/${p.id}" data-close><span>${p.name}</span><b>${rub(p.price)}</b></a></li>`)
      .join('');
    list.hidden = !found.length;
    none.hidden = !q.trim() || found.length > 0;
  };

  body.addEventListener('input', (e) => {
    updateDraftCount();
    const t = e.target as HTMLInputElement;
    if (t.type === 'search') renderResults(t.value);
  });

  return { restoreDraft, resetDraft, updateDraftCount, applyDraft, applyPreset, sort, showSortChoice };
}
