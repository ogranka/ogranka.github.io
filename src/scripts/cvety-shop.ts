// Магазин «Пион и мята»: экраны по адресу, слайдер, шторки, корзина,
// фильтр и сортировка каталога, оформление заказа в четыре шага.
import { products, featured, rub } from '../data/cvety';

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

type SheetKind = 'filter' | 'sort' | 'card' | 'ribbon' | 'search' | 'chat' | 'cart';

const TITLES: Record<SheetKind, string> = {
  filter: 'Фильтр',
  sort: 'Сортировка',
  card: 'Открытка',
  ribbon: 'Лента',
  search: 'Поиск',
  chat: 'Написать нам',
  cart: 'Корзина',
};

const DELIVERY = 400;
const FREE_FROM = 5000;
const EXACT_FEE = 1500;

export function initShop() {
  const app = $('#app');
  if (!app) return;

  const dock = $('#dock')!;
  const buy = $<HTMLButtonElement>('#buyBtn')!;
  const searchBtn = $('#searchBtn')!;
  const screens = $$('[data-screen]');

  // Экраны переключаются по #home, #catalog, #product, #checkout. У экранов
  // нет таких id нарочно: иначе браузер прокручивал бы к якорю родительскую
  // страницу, когда магазин открыт во фрейме. Начальный экран можно задать
  // параметром ?s=catalog.
  const initial = new URLSearchParams(location.search).get('s') || '';
  const screenId = (s: HTMLElement) => s.dataset.screen;

  const show = () => {
    const id = location.hash ? location.hash.slice(1) : initial || 'home';
    const target = screens.find((s) => screenId(s) === id) || screens[0];
    screens.forEach((s) => (s.hidden = s !== target));
    const isProduct = screenId(target) === 'product';
    const isCheckout = screenId(target) === 'checkout';
    buy.hidden = !isProduct;
    searchBtn.hidden = isProduct;
    dock.classList.toggle('is-product', isProduct);
    dock.hidden = isCheckout;
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

  // Галерея карточки
  const gal = $('#galTrack')!;
  gal.addEventListener(
    'scroll',
    () => {
      const n = Math.round(gal.scrollLeft / (gal.clientWidth + 8)) + 1;
      $('#galCount')!.textContent = `${n} из ${gal.children.length}`;
    },
    { passive: true },
  );

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
  const productById = (id: string) => products.find((p) => p.id === id);
  const cartSum = () => cart.reduce((sum, id) => sum + (productById(id)?.price || 0), 0);
  const syncCart = () => {
    cartCount.textContent = String(cart.length);
    cartCount.hidden = cart.length === 0;
  };
  syncCart();
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
    lastFocus = document.activeElement as HTMLElement;
    $('#sheetTitle')!.textContent = TITLES[kind];
    body.innerHTML = '';
    if (kind === 'cart') {
      renderCart();
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
    setTimeout(() => (field && kind !== 'filter' ? field : $('[data-close]', sheet)!).focus({ preventScroll: true }), 50);
    document.documentElement.style.overflow = 'hidden';
  };

  const closeSheet = () => {
    sheet.classList.remove('show');
    scrim.classList.remove('show');
    document.documentElement.style.overflow = '';
    setTimeout(() => {
      sheet.hidden = scrim.hidden = true;
    }, 340);
    lastFocus?.focus({ preventScroll: true });
  };

  // Фильтр и сортировка каталога: работают по настоящим карточкам
  const grid = $('#catalogGrid')!;
  const cards = $$('.pcard', grid);
  const order = new Map(cards.map((c, i) => [c, i]));
  const filter = { min: 0, max: Infinity, sale: false };
  let sortMode = 'popular';

  const parseNum = (v: string) => Number(v.replace(/\D/g, '')) || 0;
  const readFilter = () => {
    const min = $<HTMLInputElement>('input[name=min]', body);
    const max = $<HTMLInputElement>('input[name=max]', body);
    const sale = $<HTMLInputElement>('input[name=sale]', body);
    return {
      min: min ? parseNum(min.value) : 0,
      max: max && parseNum(max.value) ? parseNum(max.value) : Infinity,
      sale: !!sale?.checked,
    };
  };
  const restoreFilter = () => {
    const sale = $<HTMLInputElement>('input[name=sale]', body);
    if (sale) sale.checked = filter.sale;
    const min = $<HTMLInputElement>('input[name=min]', body);
    const max = $<HTMLInputElement>('input[name=max]', body);
    if (min) min.value = filter.min ? filter.min.toLocaleString('ru-RU') : '3 000';
    if (max) max.value = filter.max !== Infinity ? filter.max.toLocaleString('ru-RU') : '25 000';
  };
  const matches = (card: HTMLElement, f: typeof filter) => {
    const price = Number(card.dataset.price);
    return price >= f.min && price <= f.max && (!f.sale || 'sale' in card.dataset);
  };
  const updateFilterCount = () => {
    const f = readFilter();
    const n = cards.filter((c) => matches(c, f)).length;
    const el = $('[data-apply-count]', body);
    if (el) el.textContent = `${n} ${plural(n, ['букет', 'букета', 'букетов'])}`;
  };
  const applyFilter = () => {
    Object.assign(filter, readFilter());
    let shown = 0;
    cards.forEach((c) => {
      const ok = matches(c, filter);
      c.hidden = !ok;
      if (ok) shown++;
    });
    $('#catalogEmpty')!.hidden = shown > 0;
    const active = (filter.min > 0 ? 1 : 0) + (filter.max !== Infinity ? 1 : 0) + (filter.sale ? 1 : 0);
    const badge = $('#filterCount')!;
    badge.textContent = String(active || 2);
    badge.hidden = active === 0;
  };
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
    const labels: Record<string, string> = { popular: 'Сначала популярные', cheap: 'Сначала дешевле', dear: 'Сначала дороже', new: 'Новинки' };
    $('#sortBtn')!.firstChild!.textContent = labels[mode];
  };

  body.addEventListener('input', () => {
    if ($('[data-apply-count]', body)) updateFilterCount();
  });

  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, a');
    if (!t) return;

    if (t.dataset.sheet) return openSheet(t.dataset.sheet as SheetKind);
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
      buy.dataset.added = '';
      buy.textContent = 'В корзине, оформить';
      if (!cart.includes(featured.id)) return addToCart(featured.id);
      return openSheet('cart');
    }
    if (t.dataset.remove !== undefined) {
      cart.splice(Number(t.dataset.remove), 1);
      syncCart();
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
      $$('[aria-pressed]', body).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $$<HTMLInputElement>('input[type=checkbox]', body).forEach((c) => (c.checked = false));
      $$<HTMLInputElement>('input[name=min], input[name=max]', body).forEach((i) => (i.value = ''));
      updateFilterCount();
      return;
    }
    if ('apply' in t.dataset) {
      applyFilter();
      return closeSheet();
    }
    if (t.dataset.sort) {
      $$('[data-sort]', body).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      applySort(t.dataset.sort);
      return closeSheet();
    }
    if (t.closest('.opts, .swatches') && t.tagName === 'BUTTON' && !t.dataset.day && !t.dataset.slot) {
      t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
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
  const order_ = { day: '', slot: '' };

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
      err.textContent = order_.slot ? '' : 'Выберите интервал доставки';
      if (!order_.slot) firstBad = 'slot';
      if (field('exact').checked && !field('exactTime').value) {
        bad('exactTime', 'Укажите время');
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

  const deliveryFee = () => (cartSum() >= FREE_FROM ? 0 : DELIVERY);
  const exactFee = () => (field('exact').checked ? EXACT_FEE : 0);
  const total = () => cartSum() + deliveryFee() + exactFee();

  const renderSummary = () => {
    const items = cart
      .map((id) => {
        const p = productById(id)!;
        return `<div><span class="name">${p.name}</span><span>${rub(p.price)}</span></div>`;
      })
      .join('');
    const when = `${order_.day}, ${order_.slot}${field('exact').checked && field('exactTime').value ? `, к ${field('exactTime').value}` : ''}`;
    $('#coSummary')!.innerHTML = `${items}
      <div><span class="name">Доставка, ${when}</span><span>${deliveryFee() ? rub(deliveryFee()) : 'бесплатно'}</span></div>
      ${exactFee() ? `<div><span class="name">К точному времени</span><span>${rub(exactFee())}</span></div>` : ''}
      <div class="total"><span>Итого</span><b>${rub(total())}</b></div>`;
    nextBtn.textContent = `Оплатить ${rub(total())}`;
  };

  const renderDays = () => {
    const box = $('#dayOpts')!;
    if (box.children.length) return;
    const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
    const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : wd.format(d);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.day = `${label}, ${fmt.format(d)}`.replace('.', '');
      b.setAttribute('aria-pressed', String(i === 0));
      b.textContent = b.dataset.day;
      box.append(b);
    }
    order_.day = (box.firstElementChild as HTMLElement).dataset.day!;
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

  form.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!t) return;
    if (t.dataset.day) {
      $$('[data-day]', form).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      order_.day = t.dataset.day;
    }
    if (t.dataset.slot) {
      $$('[data-slot]', form).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      order_.slot = t.dataset.slot;
      $('#slotErr')!.textContent = '';
    }
    if (t === prevBtn) goto(step - 1);
    if (t === nextBtn) {
      const bad = validate();
      if (bad) {
        if (bad !== 'slot') field(bad).focus();
        return;
      }
      if (step < 4) return goto(step + 1);
      const n = 1000 + Math.floor(Math.random() * 9000);
      $('#coDoneText')!.textContent = `Заказ № ${n} на ${rub(total())}. Привезём ${order_.day.toLowerCase()}, ${order_.slot}, получатель ${field('name').value.trim()}.`;
      form.hidden = true;
      done.hidden = false;
      stepDots.forEach((li) => (li.dataset.done = ''));
      cart.length = 0;
      syncCart();
      window.scrollTo(0, 0);
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
    if (t.name === 'pay' || t.name === 'exact') nextBtn.textContent = step === 4 ? `Оплатить ${rub(total())}` : 'Дальше';
  });
  $('[data-co-back]')!.addEventListener('click', () => {
    if (step > 1 && !form.hidden) goto(step - 1);
    else history.length > 1 ? history.back() : (location.hash = '#catalog');
  });

  show();
}

function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}
