// Оформление заказа в четыре шага: получатель, доставка, открытка с лентой,
// оплата. Проверка полей на каждом шаге, промокод, итог с доставкой и
// доплатами и детали заказа со ссылкой «изменить» на свой шаг.
import { rub } from '../../data/cvety';
import { productById, type Cart } from './cart';
import { $, $$, must, store } from './dom';

const DELIVERY = 400;
const FREE_FROM = 5000;
const EXACT_FEE = 1500;
const PROMO = 'МЯТА';
const PROMO_RATE = 0.15;
// Курьер едет два часа: интервал на сегодня доступен, если успеваем к его концу
const DELIVERY_HOURS = 2;
const PAY_TEXT: Record<string, string> = { 'Картой онлайн': 'картой онлайн', СБП: 'по СБП', Курьеру: 'курьеру при получении' };
// Поля первого шага, которые переживают перезагрузку вкладки
const WHO_KEY = 'pm:who';
const WHO_FIELDS = ['name', 'phone', 'address', 'sender'] as const;

const phoneOk = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length === 11 && /^[78]/.test(d);
};
const slotStart = (slot: string) => Number(slot.split('–')[0].split(':')[0]);
const slotEnd = (slot: string) => Number(slot.split('–')[1].split(':')[0]);
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const hourNow = () => new Date().getHours() + new Date().getMinutes() / 60;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface CheckoutOptions {
  cart: Cart;
  say: (msg: string) => void;
  // Открытка и лента, которые покупатель уже выбрал в карточке букета
  tune: { cardText: () => string; ribbon: () => string; setRibbon: (name: string) => void; reset: () => void };
  // «Назад» с первого шага: вернуться туда, откуда пришли
  back: () => void;
}

export function initCheckout({ cart, say, tune, back }: CheckoutOptions) {
  const form = must<HTMLFormElement>('#coForm');
  const stepEls = $$('.co__step', form);
  const stepList = must('#coSteps');
  const stepDots = $$('li', stepList);
  const prevBtn = must<HTMLButtonElement>('[data-co-prev]', form);
  const nextBtn = must<HTMLButtonElement>('[data-co-next]', form);
  const empty = must('#coEmpty');
  const done = must('#coDone');
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

  const discount = () => (promoOn ? Math.round(cart.saleSum() * PROMO_RATE) : 0);
  const goods = () => cart.sum() - discount();
  const deliveryFee = () => (goods() >= FREE_FROM ? 0 : DELIVERY);
  const exactFee = () => (field('exact').checked ? EXACT_FEE : 0);
  const total = () => goods() + deliveryFee() + exactFee();
  const payValue = () => form.querySelector<HTMLInputElement>('input[name=pay]:checked')?.value || 'Картой онлайн';
  const payMethod = () => PAY_TEXT[payValue()];
  // Курьеру платят при получении: кнопка не обещает оплату сейчас
  const payLabel = () => (payValue() === 'Курьеру' ? `Оформить заказ на ${rub(total())}` : `Оплатить ${rub(total())}`);

  // Детали заказа: подпись, значение и шаг, где это меняется
  const details = (): [string, string, number][] => {
    const card = field('noCard').checked ? 'Без открытки' : field('card').value.trim() ? `«${field('card').value.trim()}»` : 'Без подписи';
    const address = field('surprise').checked ? 'Сюрприз: уточним у получателя по телефону' : field('address').value.trim();
    const exact = field('exact').checked && field('exactTime').value ? `, к ${field('exactTime').value}` : '';
    return [
      ['Получатель', `${field('name').value.trim()}, ${field('phone').value.trim()}`, 1],
      ['Адрес', address, 1],
      ['Когда', `${delivery.day}, ${delivery.slot}${exact}`, 2],
      ['Открытка', card, 3],
      ['Лента', tune.ribbon() || 'На выбор флориста', 3],
    ];
  };

  // Возвращает имя первого неверного поля или null
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
      must('#slotErr').textContent = delivery.slot ? '' : 'Выберите интервал доставки';
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

  const renderSummary = () => {
    const items = cart
      .lines()
      .map(([id, qty]) => {
        const p = productById(id)!;
        return `<div><span class="name">${p.name}${qty > 1 ? ` × ${qty}` : ''}</span><span>${rub(p.price * qty)}</span></div>`;
      })
      .join('');
    must('#coDetails').innerHTML = details()
      .map(
        ([label, value, to]) =>
          `<div><dt>${label}</dt><dd>${esc(value)}</dd><button type="button" class="co__edit" data-co-edit="${to}" aria-label="Изменить: ${label.toLowerCase()}">изменить</button></div>`,
      )
      .join('');
    must('#coSummary').innerHTML = `${items}
      ${discount() ? `<div class="disc"><span class="name">Скидка по ${PROMO}</span><span>−${rub(discount())}</span></div>` : ''}
      <div><span class="name">Доставка</span><span>${deliveryFee() ? rub(deliveryFee()) : 'бесплатно'}</span></div>
      ${exactFee() ? `<div><span class="name">К точному времени</span><span>${rub(exactFee())}</span></div>` : ''}
      <div><span class="name">Оплата</span><span>${payMethod()}</span></div>
      <div class="total"><span>Итого</span><b>${rub(total())}</b></div>`;
    nextBtn.textContent = payLabel();
  };

  // focus: перевести фокус на заголовок шага, когда шаг сменил сам покупатель
  const goto = (n: number, focus = false) => {
    step = n;
    stepEls.forEach((el) => (el.hidden = Number(el.dataset.step) !== n));
    stepDots.forEach((li, i) => {
      if (i + 1 < n) li.dataset.done = '';
      else delete li.dataset.done;
      if (i + 1 === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    prevBtn.hidden = n === 1;
    nextBtn.textContent = n === 4 ? payLabel() : 'Дальше';
    if (n === 3) syncRibbons();
    if (n === 4) renderSummary();
    window.scrollTo(0, 0);
    if (focus) stepEls[n - 1].querySelector<HTMLElement>('legend')?.focus({ preventScroll: true });
  };

  // Интервалы на сегодня, к концу которых курьер уже не успеет, недоступны
  const syncSlots = () => {
    $$<HTMLButtonElement>('[data-slot]', form).forEach((b) => {
      const late = delivery.today && slotEnd(b.dataset.slot!) <= hourNow() + DELIVERY_HOURS;
      b.disabled = late;
      if (late && delivery.slot === b.dataset.slot) {
        delivery.slot = '';
        b.setAttribute('aria-pressed', 'false');
      }
    });
  };

  // Дни доставки пересобираются при каждом открытии: от корзины зависит,
  // можно ли везти сегодня. Выбранный день сохраняется, если он ещё доступен.
  const renderDays = () => {
    const box = must('#dayOpts');
    const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
    const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
    const lastSlot = Math.max(...$$('[data-slot]', form).map((b) => slotEnd(b.dataset.slot!)));
    const preorder = cart.hasPreorder();
    // Сегодня уже ничего не успеть или в корзине букет по предзаказу: первым днём будет завтра
    const from = preorder || lastSlot <= hourNow() + DELIVERY_HOURS ? 1 : 0;
    box.replaceChildren();
    for (let i = from; i < from + 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : wd.format(d);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.day = `${label}, ${fmt.format(d)}`.replace('.', '');
      b.dataset.today = String(i === 0);
      b.textContent = b.dataset.day;
      box.append(b);
    }
    const days = $$('[data-day]', box);
    const keep = days.find((b) => b.dataset.day === delivery.day) || days[0];
    days.forEach((b) => b.setAttribute('aria-pressed', String(b === keep)));
    delivery.day = keep.dataset.day!;
    delivery.today = keep.dataset.today === 'true';
    must('#dayNote').hidden = !preorder;
    syncSlots();
  };

  const syncRibbons = () => $$('[data-co-ribbon]', form).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.coRibbon === tune.ribbon())));

  const applyPromo = () => {
    const code = field('promo').value.trim().toUpperCase();
    if (!code) return setError('promo', 'Введите промокод');
    if (code !== PROMO) {
      promoOn = false;
      setError('promo', 'Такого промокода нет');
    } else if (!cart.saleSum()) {
      promoOn = false;
      setError('promo', 'Код действует на букеты с отметкой «−15% по МЯТА», в корзине их нет');
    } else {
      promoOn = true;
      setError('promo', '');
      say(`Промокод применён, скидка ${rub(discount())}`);
    }
    renderSummary();
  };

  const saveWho = () => {
    const who: Record<string, string | boolean> = { surprise: field('surprise').checked };
    WHO_FIELDS.forEach((name) => (who[name] = field(name).value));
    store.set(WHO_KEY, who);
  };

  const restoreWho = () => {
    const who = store.get<Record<string, string | boolean> | null>(WHO_KEY, null);
    if (!who) return;
    WHO_FIELDS.forEach((name) => {
      if (!field(name).value && typeof who[name] === 'string') field(name).value = who[name] as string;
    });
    field('surprise').checked = !!who.surprise;
    must('#addressFld').hidden = field('surprise').checked;
  };

  const finish = () => {
    const n = 1000 + Math.floor(Math.random() * 9000);
    must('#coDoneText').textContent = `Заказ № ${n} на ${rub(total())}, оплата ${payMethod()}.`;
    must('#coDoneList').innerHTML = details()
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`)
      .join('');
    form.hidden = true;
    done.hidden = false;
    stepDots.forEach((li) => (li.dataset.done = ''));
    promoOn = false;
    store.drop(WHO_KEY);
    tune.reset();
    field('card').value = '';
    cart.clear();
    window.scrollTo(0, 0);
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
      must('#slotErr').textContent = '';
    }
    if (t.dataset.coRibbon !== undefined) {
      tune.setRibbon(t.dataset.coRibbon);
      return syncRibbons();
    }
    if (t.dataset.coEdit) return goto(Number(t.dataset.coEdit), true);
    if ('promo' in t.dataset) return applyPromo();
    if (t === prevBtn) goto(step - 1, true);
    if (t === nextBtn) {
      const bad = validate();
      if (bad) {
        if (bad !== 'slot') field(bad).focus();
        return;
      }
      if (step < 4) return goto(step + 1, true);
      finish();
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
    if (t.name === 'card') must('#coCardLen').textContent = String(t.value.length);
    if (t.name && t.closest('[data-fld]')) setError(t.name, '');
    if ((WHO_FIELDS as readonly string[]).includes(t.name)) saveWho();
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'surprise') {
      must('#addressFld').hidden = t.checked;
      if (t.checked) setError('address', '');
      saveWho();
    }
    if (t.name === 'exact') must('#exactFld').hidden = !t.checked;
    if (t.name === 'noCard') must('#coCardField').hidden = t.checked;
    if (t.name === 'pay' || t.name === 'exact') {
      if (step === 4) renderSummary();
      else nextBtn.textContent = 'Дальше';
    }
  });
  // «Назад» в шапке оформления: на шаг назад, а с первого шага на экран,
  // с которого пришли. history.back() во фрейме увёл бы со страницы кейса.
  must('[data-co-back]').addEventListener('click', () => {
    if (step > 1 && !form.hidden) return goto(step - 1, true);
    back();
  });

  // Экран оформления открылся: пустая корзина или первый шаг. При пустой
  // корзине шаги оформления не показываем.
  const render = () => {
    const has = cart.count() > 0;
    empty.hidden = has;
    stepList.hidden = !has;
    form.hidden = !has;
    done.hidden = true;
    if (!has) return;
    renderDays();
    restoreWho();
    if (!field('card').value && tune.cardText()) field('card').value = tune.cardText();
    must('#coCardLen').textContent = String(field('card').value.length);
    goto(1);
  };

  return { render };
}
