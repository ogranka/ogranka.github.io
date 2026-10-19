// Магазин «Пион и мята»: экраны по адресу, слайдер, шторки, корзина,
// фильтр, подборки и поиск по каталогу, карточка любого букета,
// оформление заказа в четыре шага с промокодом.
import { products, featured, rub, type Product } from '../data/cvety';
import { renderChat, type ChatHandle } from './cvety-chat';

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

type SheetKind = 'filter' | 'sort' | 'card' | 'ribbon' | 'search' | 'chat' | 'cart' | 'florist';

const TITLES: Record<SheetKind, string> = {
  filter: 'Фильтр',
  sort: 'Сортировка',
  card: 'Открытка',
  ribbon: 'Лента',
  search: 'Поиск',
  chat: 'Консультант',
  cart: 'Корзина',
  florist: 'Флорист на связи',
};

const DELIVERY = 400;
const FREE_FROM = 5000;
const EXACT_FEE = 1500;
const PROMO = 'МЯТА';
const PROMO_RATE = 0.15;
// Курьер едет два часа: интервал на сегодня доступен, если успеваем к его концу
const DELIVERY_HOURS = 2;

interface Filter {
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

export function initShop() {
  const app = $('#app');
  if (!app) return;

  const dock = $('#dock')!;
  const buy = $<HTMLButtonElement>('#buyBtn')!;
  const searchBtn = $('#searchBtn')!;
  const screens = $$('[data-screen]');
  const productById = (id: string) => products.find((p) => p.id === id);

  // Экраны переключаются по #home, #catalog, #product/<id>, #checkout. У экранов
  // нет таких id нарочно: иначе браузер прокручивал бы к якорю родительскую
  // страницу, когда магазин открыт во фрейме. Начальный экран можно задать
  // параметром ?s=catalog.
  const initial = new URLSearchParams(location.search).get('s') || '';
  const screenId = (s: HTMLElement) => s.dataset.screen;

  // Во фрейме на странице кейса история браузера общая с родителем. Переходы
  // внутри магазина заменяют запись, а не добавляют её, иначе «Назад» в браузере
  // листал бы экраны телефона вместо ухода со страницы.
  const inFrame = window.top !== window;
  const go = (hash: string) => {
    if (inFrame) location.replace(hash);
    else location.hash = hash;
  };
  let current = '';
  let previous = '';
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

  const show = () => {
    const [id, arg] = (location.hash ? location.hash.slice(1) : initial || 'home').split('/');
    const target = screens.find((s) => screenId(s) === id) || screens[0];
    const name = screenId(target)!;
    if (name !== current) {
      previous = current;
      current = name;
    }
    screens.forEach((s) => (s.hidden = s !== target));
    const isProduct = name === 'product';
    const isCheckout = name === 'checkout';
    buy.hidden = !isProduct;
    searchBtn.hidden = isProduct;
    dock.classList.toggle('is-product', isProduct);
    dock.hidden = isCheckout;
    if (isProduct) renderProduct(arg);
    if (isCheckout) renderCheckout();
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', show);

  // Слайдер главной: точки и автолистание, пока человек не трогает
  const track = $('#heroTrack')!;
  const dots = $$('#heroDots i');
  let idx = 0;
  track.addEventListener(
    'scroll',
    () => {
      idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    },
    { passive: true },
  );
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let auto: number | null = reduce
    ? null
    : window.setInterval(() => {
        if (document.hidden || screens[0].hidden) return;
        track.scrollTo({ left: ((idx + 1) % dots.length) * track.clientWidth, behavior: 'smooth' });
      }, 4500);
  ['pointerdown', 'touchstart'].forEach((e) =>
    track.addEventListener(
      e,
      () => {
        if (auto) clearInterval(auto);
        auto = null;
      },
      { passive: true },
    ),
  );

  // Карточка букета: данные из каталога, фото из карты, собранной при сборке.
  // У фирменного букета своя галерея из четырёх фото, у остальных одно.
  const gal = $('#galTrack')!;
  const galCount = $('#galCount')!;
  const featuredGallery = gal.innerHTML;
  const images: Record<string, { src: string; srcset: string }> = JSON.parse($('#productImages')?.textContent || '{}');
  let shown: Product = featured;

  const syncGalCount = () => {
    const n = Math.round(gal.scrollLeft / (gal.clientWidth + 8)) + 1;
    galCount.textContent = `${n} из ${gal.children.length}`;
    galCount.hidden = gal.children.length < 2;
  };
  gal.addEventListener('scroll', syncGalCount, { passive: true });

  const renderProduct = (id?: string) => {
    const p = (id && productById(id)) || featured;
    if (p.id !== shown.id || !gal.children.length) {
      if (p.id === featured.id) {
        gal.innerHTML = featuredGallery;
      } else {
        const img = document.createElement('img');
        const src = images[p.id];
        if (src) {
          img.src = src.src;
          img.srcset = src.srcset;
        }
        img.sizes = '100vw';
        img.alt = p.name;
        img.decoding = 'async';
        gal.replaceChildren(img);
      }
      gal.scrollLeft = 0;
    }
    shown = p;
    syncGalCount();
    $('#pdTitle')!.textContent = p.name;
    $('#pdPrice')!.textContent = rub(p.price);
    $('#pdWhen')!.textContent = p.preorder ? 'По предзаказу, привезём завтра' : 'Привезём сегодня за 2 часа';
    $('#pdText')!.textContent = p.text;
    $('#pdHeight')!.textContent = `${p.size[0]} см`;
    $('#pdDiameter')!.textContent = `${p.size[1]} см`;
    $('[data-screen="product"] .topbar [data-like]')!.setAttribute('aria-pressed', 'false');
    syncBuy();
  };

  // Всплывашка
  const toast = $('#toast')!;
  let toastTimer = 0;
  const say = (msg: string) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  };

  // Корзина: список товаров по id. Для показа оформления во фрейме
  // корзина сразу с двумя букетами.
  const cart: string[] = initial === 'checkout' ? [featured.id, 'roses-statice'] : [];
  const cartCount = $('#cartCount')!;
  const cartSum = () => cart.reduce((sum, id) => sum + (productById(id)?.price || 0), 0);
  const syncCart = () => {
    cartCount.textContent = String(cart.length);
    cartCount.hidden = cart.length === 0;
  };
  syncCart();
  const syncBuy = () => {
    const inCart = cart.includes(shown.id);
    buy.textContent = inCart ? 'В корзине · оформить' : `В корзину · ${rub(shown.price)}`;
    if (inCart) buy.dataset.added = '';
    else delete buy.dataset.added;
  };
  const addToCart = (id: string) => {
    cart.push(id);
    syncCart();
    say('Добавили в корзину');
  };

  // Шторка снизу
  const sheet = $('#sheet')!;
  const scrim = $('#scrim')!;
  const body = $('#sheetBody')!;
  let lastFocus: HTMLElement | null = null;
  let closeTimer = 0;
  let chat: ChatHandle | null = null;
  let cardText = '';
  let ribbon = '';

  const renderCart = () => {
    if (!cart.length) {
      body.innerHTML = '<p class="muted">Корзина пока пустая. Нажмите на цену под букетом, чтобы добавить его.</p>';
      return;
    }
    const rows = cart
      .map((id, i) => {
        const p = productById(id)!;
        return `<li><span class="name">${p.name}</span><span class="sum">${rub(p.price)}</span><button class="round" type="button" data-remove="${i}" aria-label="Убрать ${p.name}"><svg><use href="#i-trash"></use></svg></button></li>`;
      })
      .join('');
    body.innerHTML = `<ul class="cart-list">${rows}</ul>
      <p class="cart-total"><span>Итого</span><span>${rub(cartSum())}</span></p>
      <p class="muted small">Доставка по городу 400 ₽, от 5 000 ₽ бесплатно. Оформление в четыре шага: получатель, доставка, открытка, оплата.</p>
      <div class="sheet__foot"><a class="pill pill--ink pill--wide" href="#checkout" data-close>Оформить заказ</a></div>`;
  };

  const openSheet = (kind: SheetKind) => {
    clearTimeout(closeTimer);
    // При переходе из одной шторки в другую фокус после закрытия вернётся
    // туда, откуда открыли первую
    if ((sheet.hidden || !sheet.classList.contains('show')) && !sheet.contains(document.activeElement)) lastFocus = document.activeElement as HTMLElement;
    chat?.dispose();
    chat = null;
    $('#sheetTitle')!.textContent = TITLES[kind];
    body.innerHTML = '';
    sheet.classList.toggle('sheet--chat', kind === 'chat');
    if (kind === 'cart') {
      renderCart();
    } else if (kind === 'chat') {
      chat = renderChat(body, { onFlorist: () => openSheet('florist') });
    } else {
      body.append(($('#t-' + kind) as HTMLTemplateElement).content.cloneNode(true));
    }
    if (kind === 'card') {
      const ta = $<HTMLTextAreaElement>('#cardText', body)!;
      ta.value = cardText;
      $('#cardLen', body)!.textContent = String(ta.value.length);
      ta.addEventListener('input', () => ($('#cardLen', body)!.textContent = String(ta.value.length)));
    }
    if (kind === 'ribbon') {
      $$('[data-ribbon]', body).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ribbon === ribbon)));
    }
    if (kind === 'filter') {
      restoreFilter();
      updateFilterCount();
    }
    if (kind === 'sort') {
      $$('[data-sort]', body).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === sortMode)));
    }
    sheet.hidden = scrim.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add('show');
      scrim.classList.add('show');
    });
    const field = $<HTMLElement>('input, textarea', body);
    if (!(kind === 'chat' && initial)) {
      setTimeout(() => (field && kind !== 'filter' ? field : $('[data-close]', sheet)!).focus({ preventScroll: true }), 50);
    }
    document.documentElement.style.overflow = 'hidden';
  };

  const closeSheet = () => {
    chat?.dispose();
    chat = null;
    sheet.classList.remove('show');
    scrim.classList.remove('show');
    document.documentElement.style.overflow = '';
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      sheet.hidden = scrim.hidden = true;
    }, 340);
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  };

  // Фильтр, подборки и сортировка каталога: работают по настоящим карточкам
  const grid = $('#catalogGrid')!;
  const cards = $$('.pcard', grid);
  const order = new Map(cards.map((c, i) => [c, i]));
  const filter: Filter = { ...EMPTY };
  // Флаг «монобукеты» ставит только подборка, в шторке его нет: храним
  // отдельно, чтобы «Сбросить» в шторке снимал и его
  let draftMono = false;
  let sortMode = 'popular';

  const parseNum = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const pressed = (attr: string) => $$(`[data-${attr}][aria-pressed="true"]`, body).map((b) => b.dataset[attr]!);
  const readFilter = (): Filter => {
    const min = $<HTMLInputElement>('input[name=min]', body);
    const max = $<HTMLInputElement>('input[name=max]', body);
    return {
      min: min ? parseNum(min.value) : 0,
      max: max && parseNum(max.value) ? parseNum(max.value) : Infinity,
      sale: !!$<HTMLInputElement>('input[name=sale]', body)?.checked,
      today: !!$<HTMLInputElement>('input[name=today]', body)?.checked,
      mono: draftMono,
      flowers: pressed('flower'),
      tones: pressed('tone'),
    };
  };
  const restoreFilter = () => {
    draftMono = filter.mono;
    $<HTMLInputElement>('input[name=sale]', body)!.checked = filter.sale;
    $<HTMLInputElement>('input[name=today]', body)!.checked = filter.today;
    $<HTMLInputElement>('input[name=min]', body)!.value = filter.min ? filter.min.toLocaleString('ru-RU') : '';
    $<HTMLInputElement>('input[name=max]', body)!.value = filter.max !== Infinity ? filter.max.toLocaleString('ru-RU') : '';
    $$('[data-flower]', body).forEach((b) => b.setAttribute('aria-pressed', String(filter.flowers.includes(b.dataset.flower!))));
    $$('[data-tone]', body).forEach((b) => b.setAttribute('aria-pressed', String(filter.tones.includes(b.dataset.tone!))));
  };
  // Внутри группы условия складываются через «или», между группами через «и»
  const matches = (p: Product, f: Filter) =>
    p.price >= f.min &&
    p.price <= f.max &&
    (!f.sale || !!p.sale) &&
    (!f.today || !p.preorder) &&
    (!f.mono || !!p.mono) &&
    (!f.flowers.length || f.flowers.some((x) => p.flowers.includes(x))) &&
    (!f.tones.length || f.tones.some((x) => p.tones.includes(x)));
  const cardProduct = (c: HTMLElement) => productById(c.dataset.id!)!;
  const bouquets = (n: number) => `${n} ${plural(n, ['букет', 'букета', 'букетов'])}`;
  const activeCount = (f: Filter) =>
    [f.min > 0 || f.max !== Infinity, f.sale, f.today, f.mono, f.flowers.length > 0, f.tones.length > 0].filter(Boolean).length;

  const updateFilterCount = () => {
    const f = readFilter();
    const el = $('[data-apply-count]', body);
    if (el) el.textContent = bouquets(products.filter((p) => matches(p, f)).length);
  };
  const applyFilter = (next: Filter, preset = '') => {
    Object.assign(filter, next);
    let n = 0;
    cards.forEach((c) => {
      const ok = matches(cardProduct(c), filter);
      c.hidden = !ok;
      if (ok) n++;
    });
    $('#catalogEmpty')!.hidden = n > 0;
    $('#catalogCount')!.textContent = bouquets(n);
    const active = activeCount(filter);
    const badge = $('#filterCount')!;
    badge.textContent = String(active);
    badge.hidden = active === 0;
    const chip = preset || (active ? '' : 'all');
    $$('.chips [data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === chip)));
  };
  const applyPreset = (key: string) => applyFilter({ ...EMPTY, ...PRESETS[key] }, key);
  const applySort = (mode: string) => {
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
    const labels: Record<string, string> = { popular: 'Популярные', cheap: 'Дешевле', dear: 'Дороже', new: 'Новинки' };
    $('#sortBtn')!.firstChild!.textContent = labels[mode];
  };

  // Поиск: по названию, составу и цветам. «Пионы» находит и «пион».
  const search = (q: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return products.filter((p) => {
      const hay = `${p.name} ${p.text} ${p.flowers.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w.length > 4 ? w.slice(0, -1) : w));
    });
  };
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
    if ($('[data-apply-count]', body)) updateFilterCount();
    const t = e.target as HTMLInputElement;
    if (t.type === 'search') renderResults(t.value);
  });

  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, a');
    if (!t) return;

    if (t.dataset.sheet) return openSheet(t.dataset.sheet as SheetKind);
    if (t.dataset.preset) {
      applyPreset(t.dataset.preset);
      if ('close' in t.dataset) closeSheet();
      return;
    }
    if ('like' in t.dataset) {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      return say(on ? 'Добавили в избранное' : 'Убрали из избранного');
    }
    if (t.dataset.add) {
      t.dataset.added = '';
      return addToCart(t.dataset.add);
    }
    if (t === buy) {
      if (!cart.includes(shown.id)) {
        addToCart(shown.id);
        return syncBuy();
      }
      return openSheet('cart');
    }
    if (t.dataset.remove !== undefined) {
      cart.splice(Number(t.dataset.remove), 1);
      syncCart();
      syncBuy();
      renderCart();
      return;
    }
    if (t.dataset.copy) {
      navigator.clipboard?.writeText(t.dataset.copy).catch(() => {});
      return say(`Промокод ${t.dataset.copy} скопирован`);
    }
    if (t.dataset.ribbon) {
      ribbon = t.dataset.ribbon;
      $('#ribbonVal')!.textContent = ribbon;
      ($('#ribbonVal')!.closest('.tune__tile') as HTMLElement).dataset.set = '';
      const c = t.style.getPropertyValue('--c');
      $$('#ribbonArt i').forEach((i) => i.style.setProperty('--c', c));
      closeSheet();
      return say(`Лента: ${ribbon.toLowerCase()}`);
    }
    if (t.dataset.save === 'card') {
      cardText = $<HTMLTextAreaElement>('#cardText')!.value.trim();
      $('#cardVal')!.textContent = cardText ? `«${cardText.length > 40 ? cardText.slice(0, 40) + '…' : cardText}»` : 'Без подписи';
      ($('#cardVal')!.closest('.tune__tile') as HTMLElement).dataset.set = '';
      closeSheet();
      return say('Текст открытки сохранили');
    }
    if ('reset' in t.dataset) {
      draftMono = false;
      $$('[aria-pressed]', body).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $$<HTMLInputElement>('input[type=checkbox]', body).forEach((c) => (c.checked = false));
      $$<HTMLInputElement>('input[name=min], input[name=max]', body).forEach((i) => (i.value = ''));
      updateFilterCount();
      return;
    }
    if ('apply' in t.dataset) {
      applyFilter(readFilter());
      return closeSheet();
    }
    if (t.dataset.sort) {
      $$('[data-sort]', body).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      applySort(t.dataset.sort);
      return closeSheet();
    }
    if (t.closest('.opts, .swatches') && t.tagName === 'BUTTON' && !t.dataset.day && !t.dataset.slot) {
      t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
      if ($('[data-apply-count]', body)) updateFilterCount();
      return;
    }
    if ('close' in t.dataset) {
      if (t.getAttribute('href') === '#') e.preventDefault();
      return closeSheet();
    }
  });
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  // Шторку можно смахнуть вниз
  let y0: number | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (body.scrollTop <= 0) y0 = e.touches[0].clientY;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    },
    { passive: true },
  );
  sheet.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.style.transform = '';
    y0 = null;
    if (dy > 90) closeSheet();
  });

  // ОФОРМЛЕНИЕ ЗАКАЗА
  const form = $<HTMLFormElement>('#coForm')!;
  const stepEls = $$('.co__step', form);
  const stepDots = $$('#coSteps li');
  const prevBtn = $<HTMLButtonElement>('[data-co-prev]', form)!;
  const nextBtn = $<HTMLButtonElement>('[data-co-next]', form)!;
  const empty = $('#coEmpty')!;
  const done = $('#coDone')!;
  let step = 1;
  let promoOn = false;
  const delivery = { day: '', today: true, slot: '' };

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const setError = (name: string, msg: string) => {
    const input = field(name);
    const wrap = input.closest<HTMLElement>('[data-fld]');
    if (!wrap) return;
    const err = $('.fld__err', wrap);
    if (err) err.textContent = msg;
    if (msg) {
      wrap.dataset.invalid = '';
      input.setAttribute('aria-invalid', 'true');
    } else {
      delete wrap.dataset.invalid;
      input.removeAttribute('aria-invalid');
    }
  };
  const phoneOk = (v: string) => {
    const d = v.replace(/\D/g, '');
    return d.length === 11 && /^[78]/.test(d);
  };
  const slotEnd = (slot: string) => Number(slot.split('–')[1].split(':')[0]);
  const slotStart = (slot: string) => Number(slot.split('–')[0].split(':')[0]);
  const minutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const validate = (): string | null => {
    let firstBad: string | null = null;
    const bad = (name: string, msg: string) => {
      setError(name, msg);
      if (msg && !firstBad) firstBad = name;
    };
    if (step === 1) {
      bad('name', field('name').value.trim().length < 2 ? 'Напишите имя, хотя бы две буквы' : '');
      bad('phone', phoneOk(field('phone').value) ? '' : 'Нужен номер из 11 цифр, например +7 900 000-00-00');
      bad('address', field('surprise').checked || field('address').value.trim().length > 4 ? '' : 'Укажите улицу и дом, или включите «Сюрприз»');
      bad('sender', phoneOk(field('sender').value) ? '' : 'По этому номеру подтвердим заказ');
    }
    if (step === 2) {
      const err = $('#slotErr')!;
      err.textContent = delivery.slot ? '' : 'Выберите интервал доставки';
      if (!delivery.slot) firstBad = 'slot';
      const time = field('exactTime').value;
      if (!field('exact').checked) {
        setError('exactTime', '');
      } else if (!time) {
        bad('exactTime', 'Укажите время');
      } else if (delivery.slot && (minutes(time) < slotStart(delivery.slot) * 60 || minutes(time) > slotEnd(delivery.slot) * 60)) {
        bad('exactTime', `Время должно попадать в интервал ${delivery.slot}`);
      } else {
        setError('exactTime', '');
      }
    }
    if (step === 4) {
      bad('agree', field('agree').checked ? '' : 'Без согласия заказ не оформить');
    }
    return firstBad;
  };

  const goto = (n: number) => {
    step = n;
    stepEls.forEach((el) => (el.hidden = Number(el.dataset.step) !== n));
    stepDots.forEach((li, i) => {
      if (i + 1 < n) li.dataset.done = '';
      else delete li.dataset.done;
      if (i + 1 === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    prevBtn.hidden = n === 1;
    nextBtn.textContent = n === 4 ? `Оплатить ${rub(total())}` : 'Дальше';
    if (n === 4) renderSummary();
    window.scrollTo(0, 0);
  };

  // Промокод действует на букеты с отметкой «−15% по МЯТА»
  const saleSum = () => cart.reduce((sum, id) => sum + (productById(id)?.sale ? productById(id)!.price : 0), 0);
  const discount = () => (promoOn ? Math.round(saleSum() * PROMO_RATE) : 0);
  const goods = () => cartSum() - discount();
  const deliveryFee = () => (goods() >= FREE_FROM ? 0 : DELIVERY);
  const exactFee = () => (field('exact').checked ? EXACT_FEE : 0);
  const total = () => goods() + deliveryFee() + exactFee();
  const PAY_TEXT: Record<string, string> = { 'Картой онлайн': 'картой онлайн', СБП: 'по СБП', Курьеру: 'курьеру при получении' };
  const payMethod = () => PAY_TEXT[form.querySelector<HTMLInputElement>('input[name=pay]:checked')?.value || ''] || PAY_TEXT['Картой онлайн'];

  const renderSummary = () => {
    const items = cart
      .map((id) => {
        const p = productById(id)!;
        return `<div><span class="name">${p.name}</span><span>${rub(p.price)}</span></div>`;
      })
      .join('');
    const when = `${delivery.day}, ${delivery.slot}${field('exact').checked && field('exactTime').value ? `, к ${field('exactTime').value}` : ''}`;
    $('#coSummary')!.innerHTML = `${items}
      ${discount() ? `<div class="disc"><span class="name">Скидка по ${PROMO}</span><span>−${rub(discount())}</span></div>` : ''}
      <div><span class="name">Доставка, ${when}</span><span>${deliveryFee() ? rub(deliveryFee()) : 'бесплатно'}</span></div>
      ${exactFee() ? `<div><span class="name">К точному времени</span><span>${rub(exactFee())}</span></div>` : ''}
      <div><span class="name">Оплата</span><span>${payMethod()}</span></div>
      <div class="total"><span>Итого</span><b>${rub(total())}</b></div>`;
    nextBtn.textContent = `Оплатить ${rub(total())}`;
  };

  // Интервалы на сегодня, к концу которых курьер уже не успеет, недоступны
  const syncSlots = () => {
    const hourNow = new Date().getHours() + new Date().getMinutes() / 60;
    $$<HTMLButtonElement>('[data-slot]', form).forEach((b) => {
      const late = delivery.today && slotEnd(b.dataset.slot!) <= hourNow + DELIVERY_HOURS;
      b.disabled = late;
      if (late && delivery.slot === b.dataset.slot) {
        delivery.slot = '';
        b.setAttribute('aria-pressed', 'false');
      }
    });
  };

  const renderDays = () => {
    const box = $('#dayOpts')!;
    if (box.children.length) return;
    const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
    const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
    const hourNow = new Date().getHours() + new Date().getMinutes() / 60;
    const lastSlot = Math.max(...$$('[data-slot]', form).map((b) => slotEnd(b.dataset.slot!)));
    // Если сегодня уже ничего не успеть, первым днём будет завтра
    const from = lastSlot <= hourNow + DELIVERY_HOURS ? 1 : 0;
    for (let i = from; i < from + 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : wd.format(d);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.day = `${label}, ${fmt.format(d)}`.replace('.', '');
      b.dataset.today = String(i === 0);
      b.setAttribute('aria-pressed', String(i === from));
      b.textContent = b.dataset.day;
      box.append(b);
    }
    const first = box.firstElementChild as HTMLElement;
    delivery.day = first.dataset.day!;
    delivery.today = first.dataset.today === 'true';
    syncSlots();
  };

  const renderCheckout = () => {
    const has = cart.length > 0;
    empty.hidden = has;
    form.hidden = !has;
    done.hidden = true;
    if (!has) return;
    renderDays();
    if (!field('card').value && cardText) field('card').value = cardText;
    $('#coCardLen')!.textContent = String(field('card').value.length);
    goto(1);
  };

  const applyPromo = () => {
    const code = field('promo').value.trim().toUpperCase();
    if (!code) return setError('promo', 'Введите промокод');
    if (code !== PROMO) {
      promoOn = false;
      setError('promo', 'Такого промокода нет');
    } else if (!saleSum()) {
      promoOn = false;
      setError('promo', 'Код действует на букеты с отметкой «−15% по МЯТА», в корзине их нет');
    } else {
      promoOn = true;
      setError('promo', '');
      say(`Промокод применён, скидка ${rub(discount())}`);
    }
    renderSummary();
  };

  form.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!t) return;
    if (t.dataset.day) {
      $$('[data-day]', form).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      delivery.day = t.dataset.day;
      delivery.today = t.dataset.today === 'true';
      syncSlots();
    }
    if (t.dataset.slot) {
      $$('[data-slot]', form).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      delivery.slot = t.dataset.slot;
      $('#slotErr')!.textContent = '';
    }
    if ('promo' in t.dataset) return applyPromo();
    if (t === prevBtn) goto(step - 1);
    if (t === nextBtn) {
      const bad = validate();
      if (bad) {
        if (bad !== 'slot') field(bad).focus();
        return;
      }
      if (step < 4) return goto(step + 1);
      const n = 1000 + Math.floor(Math.random() * 9000);
      $('#coDoneText')!.textContent = `Заказ № ${n} на ${rub(total())}, оплата ${payMethod()}. Привезём ${delivery.day.toLowerCase()}, ${delivery.slot}, получатель ${field('name').value.trim()}.`;
      form.hidden = true;
      done.hidden = false;
      stepDots.forEach((li) => (li.dataset.done = ''));
      cart.length = 0;
      promoOn = false;
      syncCart();
      syncBuy();
      window.scrollTo(0, 0);
    }
  });

  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLInputElement).name === 'promo') {
      e.preventDefault();
      applyPromo();
    }
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'card') $('#coCardLen')!.textContent = String(t.value.length);
    if (t.name && t.closest('[data-fld]')) setError(t.name, '');
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'surprise') {
      $('#addressFld')!.hidden = t.checked;
      if (t.checked) setError('address', '');
    }
    if (t.name === 'exact') $('#exactFld')!.hidden = !t.checked;
    if (t.name === 'noCard') $('#coCardField')!.hidden = t.checked;
    if (t.name === 'pay' || t.name === 'exact') {
      if (step === 4) renderSummary();
      else nextBtn.textContent = 'Дальше';
    }
  });
  // «Назад» в шапке оформления: на шаг назад, а с первого шага на экран,
  // с которого пришли. history.back() во фрейме увёл бы со страницы кейса.
  $('[data-co-back]')!.addEventListener('click', () => {
    if (step > 1 && !form.hidden) return goto(step - 1);
    go(`#${previous && previous !== 'checkout' ? previous : 'catalog'}`);
  });

  show();

  // ?chat=1 открывает консультанта сразу: так кейс показывает виджет во фрейме.
  if (new URLSearchParams(location.search).get('chat') === '1') setTimeout(() => openSheet('chat'), 400);
}

function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}
