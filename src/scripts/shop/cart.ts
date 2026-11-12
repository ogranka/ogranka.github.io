// Корзина: букеты и их количество. О разметке не знает, после каждого
// изменения зовёт onChange. Повторное добавление того же букета увеличивает
// количество в строке, а не добавляет вторую строку.
import { products, type Product } from '../../data/cvety';

export const productById = (id: string): Product | undefined => products.find((p) => p.id === id);

export type Cart = ReturnType<typeof createCart>;
export type CartLine = [id: string, qty: number];

export function createCart(initial: CartLine[], onChange: () => void) {
  const lines = new Map<string, number>(initial.filter(([id, qty]) => productById(id) && qty > 0));
  const price = (id: string) => productById(id)?.price || 0;
  const total = (pick: (id: string) => number) => [...lines].reduce((s, [id, qty]) => s + pick(id) * qty, 0);
  return {
    lines: (): CartLine[] => [...lines],
    has: (id: string) => lines.has(id),
    qty: (id: string) => lines.get(id) || 0,
    count: () => total(() => 1),
    add(id: string) {
      lines.set(id, (lines.get(id) || 0) + 1);
      onChange();
    },
    // Минус на последнем экземпляре убирает строку
    dec(id: string) {
      const n = (lines.get(id) || 0) - 1;
      if (n > 0) lines.set(id, n);
      else lines.delete(id);
      onChange();
    },
    clear() {
      lines.clear();
      onChange();
    },
    sum: () => total(price),
    // Промокод действует только на букеты с отметкой «−15% по МЯТА»
    saleSum: () => total((id) => (productById(id)?.sale ? price(id) : 0)),
    // Букет по предзаказу привозим не раньше завтрашнего дня
    hasPreorder: () => [...lines.keys()].some((id) => productById(id)?.preorder),
  };
}
