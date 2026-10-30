// «Чат с ботом» рядом с телефоном на странице кейса. Мини-приложение во фрейме
// сообщает о записи и отмене, а здесь появляются те же сообщения, что бот
// прислал бы в Telegram: подтверждение с кнопкой отмены и напоминание.
interface Shown {
  id: string;
  service: string;
  master: string;
  when: string;
  time: string;
  price: string;
}

const REMIND_MS = 60_000;

export function initChatMirror() {
  const log = document.querySelector<HTMLOListElement>('[data-log]');
  if (!log) return;
  const timers = new Map<string, number>();

  const frame = () => document.querySelector<HTMLIFrameElement>('.demo iframe');

  const add = (build: (li: HTMLLIElement) => void) => {
    const li = document.createElement('li');
    li.className = 'msg msg--new';
    build(li);
    log.append(li);
    log.scrollTop = log.scrollHeight;
    return li;
  };

  const text = (li: HTMLElement, lines: string[]) => {
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      li.append(p);
    }
  };

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.source !== 'barber313') return;
    const b = e.data.booking as Shown;
    if (e.data.type === 'booked') {
      add((li) => {
        li.dataset.id = b.id;
        const head = document.createElement('p');
        head.className = 'msg__title';
        head.textContent = 'Вы записаны в Барбершоп 313';
        li.append(head);
        text(li, [b.service, `Мастер: ${b.master}`, `Когда: ${b.when}`, `Стоимость: ${b.price}, оплата на месте`]);
        const btns = document.createElement('span');
        btns.className = 'msg__btns';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'msg__btn';
        cancel.textContent = 'Отменить запись';
        cancel.addEventListener('click', () => frame()?.contentWindow?.postMessage({ source: 'barber313-host', type: 'cancel', id: b.id }, location.origin));
        btns.append(cancel);
        li.append(btns);
      });
      timers.set(
        b.id,
        window.setTimeout(() => {
          timers.delete(b.id);
          add((li) => text(li, [`Напоминание: ${b.when} вас ждёт ${b.master}.`, 'В рабочей версии за 2 часа до визита, здесь через минуту.']));
        }, REMIND_MS),
      );
    } else if (e.data.type === 'cancelled') {
      clearTimeout(timers.get(b.id));
      timers.delete(b.id);
      const li = log.querySelector<HTMLLIElement>(`li[data-id="${CSS.escape(b.id)}"]`);
      if (!li) return;
      li.replaceChildren();
      li.classList.add('msg--cancelled');
      const s = document.createElement('s');
      s.textContent = `${b.service}, ${b.when}`;
      const p = document.createElement('p');
      p.append(s);
      li.append(p);
      text(li, ['Запись отменена. Записаться снова можно в приложении.']);
    }
  });
}
