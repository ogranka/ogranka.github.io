// Чат с консультантом магазина: шторка, подсказки, стриминг ответа по SSE,
// история в sessionStorage, передача флористу. Без библиотек.
const ENDPOINT = 'https://ai.82-21-53-138.sslip.io/chat';
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
}

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

export function renderChat(body: HTMLElement, hooks: ChatHooks) {
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

  const bubble = (role: Msg['role'] | 'note', text: string) => {
    const el = document.createElement('div');
    el.className = `chat__msg chat__msg--${role}`;
    el.textContent = text;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  bubble('assistant', HELLO);
  history.forEach((m) => bubble(m.role, m.content));
  hints.hidden = history.length > 0;

  const ask = async (text: string) => {
    const q = text.trim().slice(0, MAX_LEN);
    if (!q || busy) return;
    busy = true;
    send.disabled = true;
    hints.hidden = true;
    input.value = '';
    history = [...history, { role: 'user', content: q }].slice(-MAX_TURNS + 1);
    bubble('user', q);
    const answer = bubble('assistant', '');
    answer.classList.add('is-typing');
    let full = '';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        let msg = OFFLINE;
        try {
          const data = await res.json();
          if (data && typeof data.error === 'string') msg = data.error;
        } catch {
          // тело не JSON, оставляем общий текст
        }
        throw new Error(msg);
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
          if (evt.error) throw new Error(evt.error);
        }
      }
      if (!full) throw new Error(OFFLINE);
      history = [...history, { role: 'assistant', content: full }];
      save(history);
    } catch (err) {
      answer.remove();
      bubble('note', err instanceof Error && err.message ? err.message : OFFLINE);
      history = history.slice(0, -1);
      save(history);
    } finally {
      answer.classList.remove('is-typing');
      busy = false;
      send.disabled = false;
      input.focus({ preventScroll: true });
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

  return { ask };
}
