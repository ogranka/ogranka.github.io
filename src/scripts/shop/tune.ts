// «Настройте букет» в карточке: текст открытки и цвет ленты. Выбор
// показывается на плитках и переносится в оформление заказа.
import { $, $$, must } from './dom';

export function initTune(say: (msg: string) => void) {
  let cardText = '';
  let ribbon = '';

  const tile = (id: string) => must(id).closest<HTMLElement>('.tune__tile')!;

  // Шторка «Открытка»: подставить сохранённый текст и счётчик знаков
  const fillCard = (body: HTMLElement) => {
    const ta = must<HTMLTextAreaElement>('#cardText', body);
    const len = must('#cardLen', body);
    ta.value = cardText;
    len.textContent = String(ta.value.length);
    ta.addEventListener('input', () => (len.textContent = String(ta.value.length)));
  };

  const fillRibbon = (body: HTMLElement) => {
    $$('[data-ribbon]', body).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ribbon === ribbon)));
  };

  const saveCard = () => {
    cardText = ($<HTMLTextAreaElement>('#cardText')?.value || '').trim();
    must('#cardVal').textContent = cardText ? `«${cardText.length > 40 ? cardText.slice(0, 40) + '…' : cardText}»` : 'Без подписи';
    tile('#cardVal').dataset.set = '';
    say('Текст открытки сохранили');
  };

  const pickRibbon = (button: HTMLElement) => {
    ribbon = button.dataset.ribbon!;
    must('#ribbonVal').textContent = ribbon;
    tile('#ribbonVal').dataset.set = '';
    const color = button.style.getPropertyValue('--c');
    $$('#ribbonArt i').forEach((i) => i.style.setProperty('--c', color));
    say(`Лента: ${ribbon.toLowerCase()}`);
  };

  return { fillCard, fillRibbon, saveCard, pickRibbon, cardText: () => cardText };
}
