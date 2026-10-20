// Квиз расчёта стоимости: пять шагов, итог по формуле из data/dom.ts, потом
// форма телефона. В демо заявка никуда не отправляется.
import { estimate, rub, type QuizAnswers } from '../../data/dom';

const TOTAL = 5;

export function initQuiz() {
  const form = document.querySelector<HTMLFormElement>('[data-quiz]');
  const lead = document.querySelector<HTMLFormElement>('[data-lead]');
  const done = document.querySelector<HTMLElement>('[data-done]');
  if (!form || !lead || !done) return;
  const steps = [...form.querySelectorAll<HTMLElement>('.quiz__step')];
  const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const label = document.querySelector<HTMLElement>('[data-step-label]')!;
  const bar = document.querySelector<HTMLElement>('[data-bar]')!;
  const areaOut = form.querySelector<HTMLOutputElement>('[data-area-out]')!;
  let at = 0;

  const answers = (): QuizAnswers => {
    const d = new FormData(form);
    return { area: Number(d.get('area')), floors: d.get('floors'), foundation: d.get('foundation'), finish: d.get('finish'), pace: d.get('pace') } as QuizAnswers;
  };

  const render = () => {
    const e = estimate(answers());
    // Диапазон переносится только по тире, внутри суммы разрыва нет
    form.querySelector('[data-sum]')!.innerHTML = `<span class="nowrap">${rub(e.low)}</span> — <span class="nowrap">${rub(e.high)}</span>`;
    form.querySelector('[data-weeks]')!.textContent = `Срок стройки около ${e.weeks} недель`;
    form.querySelector('[data-lines]')!.innerHTML = e.lines.map((l) => `<li><span>${l.label}</span><span>${rub(l.value)}</span></li>`).join('');
  };

  const show = (i: number, focus = true) => {
    at = i;
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    const result = i === TOTAL;
    label.textContent = result ? 'Готово' : `Шаг ${i + 1} из ${TOTAL}`;
    bar.style.width = `${((result ? TOTAL : i + 1) / TOTAL) * 100}%`;
    back.hidden = i === 0;
    next.hidden = result;
    next.textContent = i === TOTAL - 1 ? 'Посчитать' : 'Дальше';
    lead.hidden = !result;
    if (result) render();
    if (focus) {
      // Фокус на заголовок шага: экранный диктор прочитает вопрос
      const target = steps[i].querySelector<HTMLElement>('legend, .result__sum');
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }
  };

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'area') areaOut.textContent = `${t.value} м²`;
    if (at === TOTAL) render();
  });
  next.addEventListener('click', () => show(Math.min(TOTAL, at + 1)));
  back.addEventListener('click', () => show(Math.max(0, at - 1)));
  form.addEventListener('submit', (e) => e.preventDefault());

  // Телефон: подставляем формат по мере ввода, проверяем 10 цифр после +7
  const phone = lead.querySelector<HTMLInputElement>('[name="phone"]')!;
  const phoneError = lead.querySelector<HTMLElement>('#phone-error')!;
  const consent = lead.querySelector<HTMLInputElement>('[name="consent"]')!;
  const consentError = lead.querySelector<HTMLElement>('[data-consent-error]')!;
  const digits = () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    return d.slice(0, 10);
  };
  phone.addEventListener('input', () => {
    const d = digits();
    const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
    phone.value = d ? `+7 (${parts[0]}${d.length >= 3 ? ')' : ''}${parts[1] ? ' ' + parts[1] : ''}${parts[2] ? '-' + parts[2] : ''}${parts[3] ? '-' + parts[3] : ''}` : '';
    if (phone.getAttribute('aria-invalid') === 'true' && d.length === 10) {
      phone.removeAttribute('aria-invalid');
      phoneError.textContent = '';
    }
  });
  consent.addEventListener('change', () => consent.checked && (consentError.textContent = ''));

  lead.addEventListener('submit', (e) => {
    e.preventDefault();
    const okPhone = digits().length === 10;
    phone.toggleAttribute('aria-invalid', !okPhone);
    if (!okPhone) phone.setAttribute('aria-invalid', 'true');
    phoneError.textContent = okPhone ? '' : 'Введите номер полностью: 10 цифр после +7';
    consentError.textContent = consent.checked ? '' : 'Нужно согласие, иначе мы не можем позвонить';
    if (!okPhone) return phone.focus();
    if (!consent.checked) return consent.focus();
    lead.hidden = true;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  done.querySelector('[data-restart]')!.addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    lead.reset();
    show(0);
  });

  show(0, false);
}
