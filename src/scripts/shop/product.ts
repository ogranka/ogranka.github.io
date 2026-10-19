// Карточка букета: данные из каталога, фото из карты, собранной при сборке.
// У фирменного букета своя галерея из четырёх фото, у остальных одно.
import { featured, rub, type Product } from '../../data/cvety';
import { productById, type Cart } from './cart';
import { $, must } from './dom';

export function initProduct(cart: Cart, buy: HTMLButtonElement) {
  const gal = must('#galTrack');
  const galCount = must('#galCount');
  const featuredGallery = gal.innerHTML;
  const images: Record<string, { src: string; srcset: string }> = JSON.parse($('#productImages')?.textContent || '{}');
  let shown: Product = featured;

  const syncGalCount = () => {
    const n = Math.round(gal.scrollLeft / (gal.clientWidth + 8)) + 1;
    galCount.textContent = `${n} из ${gal.children.length}`;
    galCount.hidden = gal.children.length < 2;
  };
  gal.addEventListener('scroll', syncGalCount, { passive: true });

  // Кнопка в плавающем блоке: «в корзину» или «оформить», если букет уже там
  const syncBuy = () => {
    const inCart = cart.has(shown.id);
    buy.textContent = inCart ? 'В корзине · оформить' : `В корзину · ${rub(shown.price)}`;
    if (inCart) buy.dataset.added = '';
    else delete buy.dataset.added;
  };

  const showGallery = (p: Product) => {
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
  };

  const render = (id?: string) => {
    const p = (id && productById(id)) || featured;
    if (p.id !== shown.id || !gal.children.length) showGallery(p);
    shown = p;
    syncGalCount();
    must('#pdTitle').textContent = p.name;
    must('#pdPrice').textContent = rub(p.price);
    must('#pdWhen').textContent = p.preorder ? 'По предзаказу, привезём завтра' : 'Привезём сегодня за 2 часа';
    must('#pdText').textContent = p.text;
    must('#pdHeight').textContent = `${p.size[0]} см`;
    must('#pdDiameter').textContent = `${p.size[1]} см`;
    must('[data-screen="product"] .topbar [data-like]').setAttribute('aria-pressed', 'false');
    syncBuy();
  };

  return { render, syncBuy, shown: () => shown };
}
