// «Настройте букет» в карточке: текст открытки и цвет ленты. Выбор
// показывается на плитках и переносится в оформление заказа, где его можно
// поменять на шаге «Открытка».
import { RIBBONS } from '../../data/cvety';
import { $, $$, must, store } from './dom';

// Цвета на плитке ленты, пока лента не выбрана
const ART_DEFAULT = ['#f4c9d3', '#ffffff', '#bfe3d6', '#7a2842'];
// Выбор переживает перезагрузку вкладки, как корзина
const KEY = 'pm:tune';

export function initTune(say: (msg: string) => void) {
  const saved = store.get(KEY, { card: '', ribbon: '' });
  let cardText = saved.card;
  let ribbon = saved.ribbon;
  const keep = () => store.set(KEY, { card: cardText, ribbon });

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

  const showCard = () => {
    must('#cardVal').textContent = cardText ? `«${cardText.length > 40 ? cardText.slice(0, 40) + '…' : cardText}»` : 'Без подписи';
    tile('#cardVal').dataset.set = '';
  };

  const saveCard = () => {
    cardText = ($<HTMLTextAreaElement>('#cardText')?.value || '').trim();
    showCard();
    keep();
    say('Текст открытки сохранили');
  };

  // Пустое имя: лента на выбор флориста, плитка возвращается к исходному виду
  const setRibbon = (name: string) => {
    ribbon = name;
    const color = RIBBONS.find((r) => r.name === name)?.color;
    must('#ribbonVal').textContent = name || '8 цветов на выбор';
    if (name) tile('#ribbonVal').dataset.set = '';
    else delete tile('#ribbonVal').dataset.set;
    $$('#ribbonArt i').forEach((i, n) => i.style.setProperty('--c', color || ART_DEFAULT[n]));
    keep();
  };

  const pickRibbon = (button: HTMLElement) => {
    setRibbon(button.dataset.ribbon!);
    say(`Лента: ${ribbon.toLowerCase()}`);
  };

  // Сохранённый выбор сразу виден на плитках
  if (cardText) showCard();
  if (ribbon) setRibbon(ribbon);

  // Заказ оформлен: следующий букет настраивается с чистого листа
  const reset = () => {
    cardText = '';
    must('#cardVal').textContent = 'Бесплатно, напишем ваш текст';
    delete tile('#cardVal').dataset.set;
    setRibbon('');
  };

  return { fillCard, fillRibbon, saveCard, pickRibbon, setRibbon, reset, cardText: () => cardText, ribbon: () => ribbon };
}
