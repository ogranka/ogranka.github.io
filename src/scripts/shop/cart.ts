// Корзина: список id букетов и производные суммы. О разметке не знает,
// после каждого изменения зовёт onChange.
import { products, type Product } from '../../data/cvety';

export const productById = (id: string): Product | undefined => products.find((p) => p.id === id);

export type Cart = ReturnType<typeof createCart>;

export function createCart(initial: string[], onChange: () => void) {
  const items = [...initial];
  const price = (id: string) => productById(id)?.price || 0;
  return {
    items: items as readonly string[],
    has: (id: string) => items.includes(id),
    add(id: string) {
      items.push(id);
      onChange();
    },
    removeAt(index: number) {
      items.splice(index, 1);
      onChange();
    },
    clear() {
      items.length = 0;
      onChange();
    },
    sum: () => items.reduce((s, id) => s + price(id), 0),
    // Промокод действует только на букеты с отметкой «−15% по МЯТА»
    saleSum: () => items.reduce((s, id) => s + (productById(id)?.sale ? price(id) : 0), 0),
  };
}
