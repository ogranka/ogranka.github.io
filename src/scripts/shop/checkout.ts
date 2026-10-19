// Оформление заказа в четыре шага: получатель, доставка, открытка, оплата.
// Проверка полей на каждом шаге, промокод и итог с доставкой и доплатами.
import { rub } from '../../data/cvety';
import { productById, type Cart } from './cart';
import { $, $$, must } from './dom';

const DELIVERY = 400;
const FREE_FROM = 5000;
const EXACT_FEE = 1500;
const PROMO = 'МЯТА';
const PROMO_RATE = 0.15;
// Курьер едет два часа: интервал на сегодня доступен, если успеваем к его концу
const DELIVERY_HOURS = 2;
const PAY_TEXT: Record<string, string> = { 'Картой онлайн': 'картой онлайн', СБП: 'по СБП', Курьеру: 'курьеру при получении' };

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

interface CheckoutOptions {
  cart: Cart;
  say: (msg: string) => void;
  // Текст открытки, который покупатель уже написал в карточке букета
  cardText: () => string;
  // «Назад» с первого шага: вернуться туда, откуда пришли
  back: () => void;
}

export function initCheckout({ cart, say, cardText, back }: CheckoutOptions) {
  const form = must<HTMLFormElement>('#coForm');
  const stepEls = $$('.co__step', form);
  const stepDots = $$('#coSteps li');
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
  const payMethod = () => PAY_TEXT[form.querySelector<HTMLInputElement>('input[name=pay]:checked')?.value || ''] || PAY_TEXT['Картой онлайн'];

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
    const items = cart.items
      .map((id) => {
        const p = productById(id)!;
        return `<div><span class="name">${p.name}</span><span>${rub(p.price)}</span></div>`;
      })
      .join('');
    const when = `${delivery.day}, ${delivery.slot}${field('exact').checked && field('exactTime').value ? `, к ${field('exactTime').value}` : ''}`;
    must('#coSummary').innerHTML = `${items}
      ${discount() ? `<div class="disc"><span class="name">Скидка по ${PROMO}</span><span>−${rub(discount())}</span></div>` : ''}
      <div><span class="name">Доставка, ${when}</span><span>${deliveryFee() ? rub(deliveryFee()) : 'бесплатно'}</span></div>
      ${exactFee() ? `<div><span class="name">К точному времени</span><span>${rub(exactFee())}</span></div>` : ''}
      <div><span class="name">Оплата</span><span>${payMethod()}</span></div>
      <div class="total"><span>Итого</span><b>${rub(total())}</b></div>`;
    nextBtn.textContent = `Оплатить ${rub(total())}`;
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
    nextBtn.textContent = n === 4 ? `Оплатить ${rub(total())}` : 'Дальше';
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

  const renderDays = () => {
    const box = must('#dayOpts');
    if (box.children.length) return;
    const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
    const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
    const lastSlot = Math.max(...$$('[data-slot]', form).map((b) => slotEnd(b.dataset.slot!)));
    // Если сегодня уже ничего не успеть, первым днём будет завтра
    const from = lastSlot <= hourNow() + DELIVERY_HOURS ? 1 : 0;
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

  const finish = () => {
    const n = 1000 + Math.floor(Math.random() * 9000);
    must('#coDoneText').textContent = `Заказ № ${n} на ${rub(total())}, оплата ${payMethod()}. Привезём ${delivery.day.toLowerCase()}, ${delivery.slot}, получатель ${field('name').value.trim()}.`;
    form.hidden = true;
    done.hidden = false;
    stepDots.forEach((li) => (li.dataset.done = ''));
    promoOn = false;
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
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'surprise') {
      must('#addressFld').hidden = t.checked;
      if (t.checked) setError('address', '');
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

  // Экран оформления открылся: пустая корзина или первый шаг
  const render = () => {
    const has = cart.items.length > 0;
    empty.hidden = has;
    form.hidden = !has;
    done.hidden = true;
    if (!has) return;
    renderDays();
    if (!field('card').value && cardText()) field('card').value = cardText();
    must('#coCardLen').textContent = String(field('card').value.length);
    goto(1);
  };

  return { render };
}
