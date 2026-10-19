// Форматирование дат, денег и склонений для интерфейса кабинета.
export const rub = (n: number) => `${n.toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`;

export const time = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const dayLabel = (d: Date) => d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

export const dateTime = (iso: string) => `${dayLabel(new Date(iso))}, ${time(iso)}`;

export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n);
  const m10 = a % 10;
  const m100 = a % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}

// «Подготовка к ЕГЭ» → «подготовка к ЕГЭ»: строчная первая буква, аббревиатуры целы
export const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s);

export const lessonsWord = (n: number) => `${n} ${plural(n, ['занятие', 'занятия', 'занятий'])}`;

// Значение для <input type="datetime-local"> в местном времени
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
