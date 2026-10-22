// Чат с консультантом магазина: шторка, подсказки, стриминг ответа по SSE,
// история в sessionStorage, передача флористу. Без библиотек.
// Адрес прокси можно переопределить при сборке, например под свой поддомен
const ENDPOINT = import.meta.env.PUBLIC_CHAT_ENDPOINT || 'https://ai.ogranka-web.ru/chat';
const STORE = 'pm-chat';
const MAX_TURNS = 12;
const MAX_LEN = 600;
const HELLO = 'Здравствуйте! Я консультант «Пион и мята». Подскажу букет, цену и доставку.';
const HINTS = ['Что подарить маме', 'Доставка сегодня', 'Букет до 5000'];
const OFFLINE = 'Консультант сейчас недоступен. Напишите нам в мессенджер, ответим лично.';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHooks {
  onFlorist: () => void;
  /** Показать пример диалога, пока своей истории нет: так кейс не открывается пустым чатом */
  example?: boolean;
}

// Настоящий ответ консультанта на этот вопрос, записанный 19.10.2026. Только для
// показа: в историю и в запрос к серверу не попадает.
const EXAMPLE: Msg[] = [
  { role: 'user', content: 'Что подарить маме' },
  {
    role: 'assistant',
    content:
      'Маме отлично подойдут пионы «Сара Бернар» за 12 900 руб.: 15 пышных пионов с мятой и эвкалиптом, сегодня есть в наличии. Если хочется понежнее и подешевле, посмотрите «Нежность утра» за 6 100 руб. или «Роза и сирень в лиловом» за 7 400 руб., на нее сейчас скидка 15 процентов по промокоду МЯТА на первый заказ. Расскажите, какой у вас бюджет и какие цветы мама любит, подскажу точнее.',
  },
];

export interface ChatHandle {
  ask: (text: string) => Promise<void>;
  /** Прервать ответ и отпустить шторку: вызывается при закрытии */
  dispose: () => void;
}

// Ошибка, текст которой прислал сервер консультанта и его можно показать
// покупателю. Остальные ошибки (сеть, разбор ответа) показываются общим текстом.
class ShownError extends Error {}

function load(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORE);
    const list = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && typeof m.content === 'string') : [];
  } catch {
    return [];
  }
}

function save(list: Msg[]) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(list.slice(-MAX_TURNS)));
  } catch {
    // приватный режим: история живет до закрытия шторки
  }
}

export function renderChat(body: HTMLElement, hooks: ChatHooks): ChatHandle {
  body.innerHTML = `
    <div class="chat" data-chat>
      <div class="chat__log" data-log aria-live="polite"></div>
      <div class="chat__hints" data-hints>${HINTS.map((h) => `<button type="button" data-hint>${h}</button>`).join('')}</div>
      <form class="chat__form" data-form>
        <label class="field field--chat"><span class="sr">Ваш вопрос</span><input type="text" name="q" maxlength="${MAX_LEN}" placeholder="Спросите про букет или доставку" autocomplete="off" enterkeyhint="send"></label>
        <button class="round round--ink" type="submit" aria-label="Отправить"><svg><use href="#i-send"></use></svg></button>
      </form>
      <button class="chat__florist" type="button" data-florist>Позвать флориста</button>
    </div>`;

  const log = body.querySelector<HTMLElement>('[data-log]')!;
  const hints = body.querySelector<HTMLElement>('[data-hints]')!;
  const form = body.querySelector<HTMLFormElement>('[data-form]')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const send = form.querySelector<HTMLButtonElement>('button')!;
  let history = load();
  let busy = false;
  let controller: AbortController | null = null;
  let disposed = false;

  const bubble = (role: Msg['role'] | 'note', text: string) => {
    const el = document.createElement('div');
    el.className = `chat__msg chat__msg--${role}`;
    el.textContent = text;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  bubble('assistant', HELLO);
  const exampleEls: HTMLElement[] = [];
  if (hooks.example && !history.length) {
    exampleEls.push(bubble('note', 'Пример разговора. Спросите своё, консультант ответит вживую.'));
    EXAMPLE.forEach((m) => exampleEls.push(bubble(m.role, m.content)));
    // Подсказка с тем же вопросом, что в примере, лишняя
    hints.querySelectorAll('[data-hint]').forEach((h) => h.textContent === EXAMPLE[0].content && h.remove());
    log.scrollTop = 0;
  }
  history.forEach((m) => bubble(m.role, m.content));
  hints.hidden = history.length > 0;

  const ask = async (text: string) => {
    const q = text.trim().slice(0, MAX_LEN);
    if (!q || busy) return;
    busy = true;
    send.disabled = true;
    hints.hidden = true;
    input.value = '';
    // Пример уступает место настоящему разговору
    exampleEls.splice(0).forEach((el) => el.remove());
    const turn: Msg = { role: 'user', content: q };
    history = [...history, turn].slice(-MAX_TURNS + 1);
    bubble('user', q);
    const answer = bubble('assistant', '');
    answer.classList.add('is-typing');
    // Скринридер прочитает ответ целиком, когда он допишется, а не по словам
    log.setAttribute('aria-busy', 'true');
    let full = '';
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 45000);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let msg = OFFLINE;
        try {
          const data = await res.json();
          if (data && typeof data.error === 'string') msg = data.error;
        } catch {
          // тело не JSON, оставляем общий текст
        }
        throw new ShownError(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const evt = JSON.parse(line.slice(5));
          if (evt.t) {
            full += evt.t;
            answer.textContent = full;
            log.scrollTop = log.scrollHeight;
          }
          if (evt.error) throw new ShownError(evt.error);
        }
      }
      if (!full) throw new ShownError(OFFLINE);
      history = [...history, { role: 'assistant', content: full }];
      save(history);
    } catch (err) {
      // Шторку закрыли посреди ответа: вопрос не сохраняем, писать некуда
      if (disposed) return;
      answer.remove();
      bubble('note', err instanceof ShownError && err.message ? err.message : OFFLINE);
      history = history.slice(0, -1);
      save(history);
    } finally {
      clearTimeout(timeout);
      controller = null;
      log.removeAttribute('aria-busy');
      answer.classList.remove('is-typing');
      busy = false;
      send.disabled = false;
      if (!disposed) input.focus({ preventScroll: true });
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
  hints.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-hint]');
    if (b) ask(b.textContent || '');
  });
  body.querySelector('[data-florist]')!.addEventListener('click', hooks.onFlorist);

  return {
    ask,
    dispose: () => {
      disposed = true;
      controller?.abort();
    },
  };
}
