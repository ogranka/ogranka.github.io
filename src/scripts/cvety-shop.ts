// Магазин «Пион и мята»: собирает модули из ./shop и раздаёт клики по
// разметке. Экраны и адреса в navigation, каталог и фильтр в catalog,
// шторка в sheet, оформление в checkout.
import { featured, rub } from '../data/cvety';
import { renderChat } from './cvety-chat';
import { createCart, productById, type CartLine } from './shop/cart';
import { initCatalog } from './shop/catalog';
import { initCheckout } from './shop/checkout';
import { $, $$, createToast, must, store } from './shop/dom';
import { createFavorites } from './shop/favorites';
import { initHero } from './shop/hero';
import { initNavigation } from './shop/navigation';
import { initProduct } from './shop/product';
import { initSheet, type SheetKind } from './shop/sheet';
import { initTune } from './shop/tune';

const CART_KEY = 'pm:cart';

export function initShop() {
  if (!$('#app')) return;

  const params = new URLSearchParams(location.search);
  const initial = params.get('s') || '';
  const dock = must('#dock');
  const buy = must<HTMLButtonElement>('#buyBtn');
  const searchBtn = must('#searchBtn');
  const cartCount = must('#cartCount');
  const screens = $$('[data-screen]');
  const say = createToast(must('#toast'));

  // Кнопка цены под букетом помнит, что букет уже в корзине
  const syncCart = () => {
    const n = cart.count();
    cartCount.textContent = String(n);
    cartCount.hidden = n === 0;
    $$('[data-add]').forEach((b) => b.toggleAttribute('data-added', cart.has(b.dataset.add!)));
    product.syncBuy();
    store.set(CART_KEY, cart.lines());
  };
  // Для показа оформления во фрейме кейса корзина сразу с двумя букетами
  const demo: CartLine[] = [
    [featured.id, 1],
    ['roses-statice', 1],
  ];
  const cart = createCart(initial === 'checkout' ? demo : store.get<CartLine[]>(CART_KEY, []), () => syncCart());
  const product = initProduct(cart, buy);
  const tune = initTune(say);
  const favorites = createFavorites(() => catalog.refresh());
  const catalog = initCatalog(must('#sheetBody'), favorites);
  syncCart();
  favorites.sync();

  const renderCart = (body: HTMLElement) => {
    if (!cart.count()) {
      body.innerHTML = '<p class="muted">Корзина пока пустая. Нажмите на цену под букетом, чтобы добавить его.</p>';
      return;
    }
    const rows = cart
      .lines()
      .map(([id, qty]) => {
        const p = productById(id)!;
        return `<li>
          <span class="info"><span class="name">${p.name}</span><span class="sum">${rub(p.price * qty)}</span></span>
          <span class="qty">
            <button class="round" type="button" data-dec="${id}" aria-label="${qty > 1 ? 'Убрать один' : 'Убрать из корзины'}: ${p.name}"><svg><use href="#i-${qty > 1 ? 'minus' : 'trash'}"></use></svg></button>
            <b aria-label="${qty} шт.">${qty}</b>
            <button class="round" type="button" data-inc="${id}" aria-label="Ещё один: ${p.name}"><svg><use href="#i-plus"></use></svg></button>
          </span>
        </li>`;
      })
      .join('');
    body.innerHTML = `<ul class="cart-list">${rows}</ul>
      <p class="cart-total"><span>Итого</span><span>${rub(cart.sum())}</span></p>
      <p class="muted small">Доставка по городу 400 ₽, от 5 000 ₽ бесплатно. Оформление в четыре шага: получатель, доставка, открытка, оплата.</p>
      <div class="sheet__foot"><a class="pill pill--ink pill--wide" href="#checkout" data-close>Оформить заказ</a></div>`;
  };

  const sheet = initSheet({
    background: [...screens, dock],
    keepFocus: (kind) => kind === 'chat' && !!initial,
    fill: (kind, body) => {
      if (kind === 'cart') return renderCart(body);
      if (kind === 'chat') {
        const chat = renderChat(body, { onFlorist: () => sheet.open('florist'), example: params.get('example') === '1' });
        return () => chat.dispose();
      }
      body.append(must<HTMLTemplateElement>('#t-' + kind).content.cloneNode(true));
      if (kind === 'card') tune.fillCard(body);
      if (kind === 'ribbon') tune.fillRibbon(body);
      if (kind === 'filter') catalog.restoreDraft();
      if (kind === 'sort') catalog.showSortChoice();
    },
  });

  const nav = initNavigation(screens, initial, ({ screen, arg }) => {
    const isProduct = screen === 'product';
    const isCheckout = screen === 'checkout';
    buy.hidden = !isProduct;
    searchBtn.hidden = isProduct;
    dock.classList.toggle('is-product', isProduct);
    dock.hidden = isCheckout;
    if (isProduct) {
      product.render(arg);
      favorites.sync();
    }
    if (isCheckout) checkout.render();
  });

  const checkout = initCheckout({
    cart,
    say,
    tune,
    back: () => {
      const prev = nav.previous();
      nav.go(`#${prev && !prev.startsWith('checkout') ? prev : 'catalog'}`);
    },
  });

  initHero(screens[0]);

  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, a');
    if (!t) return;
    const d = t.dataset;

    if (d.sheet) return sheet.open(d.sheet as SheetKind);
    if (d.preset) {
      catalog.applyPreset(d.preset);
      if ('close' in d) sheet.close();
      return;
    }
    if (d.like) return say(favorites.toggle(d.like) ? 'Добавили в избранное' : 'Убрали из избранного');
    if (d.add) {
      cart.add(d.add);
      const n = cart.qty(d.add);
      return say(n > 1 ? `Добавили ещё один, в корзине ${n}` : 'Добавили в корзину');
    }
    if (t === buy) {
      const id = product.shown().id;
      if (cart.has(id)) return sheet.open('cart');
      cart.add(id);
      return say('Добавили в корзину');
    }
    if (d.inc || d.dec) {
      if (d.inc) cart.add(d.inc);
      else cart.dec(d.dec!);
      return renderCart(sheet.body);
    }
    if (d.copy) {
      navigator.clipboard?.writeText(d.copy).catch(() => {});
      return say(`Промокод ${d.copy} скопирован`);
    }
    if (d.ribbon) {
      tune.pickRibbon(t);
      return sheet.close();
    }
    if (d.save === 'card') {
      tune.saveCard();
      return sheet.close();
    }
    if ('reset' in d) return catalog.resetDraft();
    if ('apply' in d) {
      catalog.applyDraft();
      return sheet.close();
    }
    if (d.sort) {
      catalog.sort(d.sort);
      return sheet.close();
    }
    // Кнопки-переключатели в шторке фильтра: цветы и оттенки
    if (t.closest('.opts, .swatches') && t.tagName === 'BUTTON' && !d.day && !d.slot) {
      t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
      return catalog.updateDraftCount();
    }
    if ('close' in d) {
      if (t.getAttribute('href') === '#') e.preventDefault();
      return sheet.close();
    }
  });

  nav.show();

  // ?chat=1 открывает консультанта сразу: так кейс показывает виджет во фрейме
  if (params.get('chat') === '1') setTimeout(() => sheet.open('chat'), 400);
}
