// Начальные данные демо. Строятся от текущей недели, поэтому расписание
// всегда живое: прошлые недели проведены, текущая частично, впереди план.
import { addDays, isCharged, startOfWeek } from './rules';
import type { KabinetState, Lesson, Payment, Student } from './types';

export const STATE_VERSION = 2;

const students: Student[] = [
  { id: 'misha', name: 'Миша Орлов', grade: '7 класс', goal: 'Школьная программа, подтянуть грамматику', parent: { name: 'Ольга', phone: '+7 900 000-00-11' }, pricePerLesson: 1800, tone: 'blue' },
  { id: 'varya', name: 'Варя Белова', grade: '5 класс', goal: 'Разговорный английский', parent: { name: 'Андрей', phone: '+7 900 000-00-12' }, pricePerLesson: 1600, tone: 'green' },
  { id: 'timur', name: 'Тимур Галиев', grade: '10 класс', goal: 'Подготовка к ЕГЭ', parent: { name: 'Наиля', phone: '+7 900 000-00-13' }, pricePerLesson: 2200, tone: 'amber' },
  { id: 'sonya', name: 'Соня Миронова', grade: '3 класс', goal: 'Первые шаги, чтение', parent: { name: 'Екатерина', phone: '+7 900 000-00-14' }, pricePerLesson: 1500, tone: 'violet' },
  { id: 'lev', name: 'Лев Ким', grade: '8 класс', goal: 'Олимпиада, лексика', parent: { name: 'Виктор', phone: '+7 900 000-00-15' }, pricePerLesson: 1900, tone: 'rose' },
];

// Расписание недели: день (0 понедельник), час, минуты, длительность
const slots: Record<string, [number, number, number, number][]> = {
  misha: [[0, 16, 0, 60], [3, 16, 0, 60]],
  varya: [[1, 15, 0, 60], [4, 15, 0, 60]],
  timur: [[2, 18, 0, 90], [5, 11, 0, 90]],
  sonya: [[0, 17, 30, 45], [2, 17, 0, 45]],
  lev: [[3, 18, 0, 60]],
};

const topics: Record<string, string[]> = {
  misha: ['Present Perfect', 'Неправильные глаголы', 'Чтение: Holes', 'Past Simple и Present Perfect', 'Аудирование: интервью', 'Контрольная по модулю', 'Модальные глаголы', 'Пересказ главы', 'Предлоги времени', 'Письмо другу'],
  varya: ['Моя семья', 'Описание картинки', 'Игра «Магазин»', 'Песня и новые слова', 'Диалог в кафе', 'Рассказ о выходных', 'Погода и одежда', 'Мой день', 'Хобби', 'Город и дорога'],
  timur: ['Эссе: структура', 'Задание 38, графики', 'Грамматика ЕГЭ', 'Аудирование ЕГЭ', 'Пробник: письменная часть', 'Словообразование', 'Устная часть', 'Чтение на время', 'Личное письмо', 'Разбор пробника'],
  sonya: ['Алфавит', 'Цвета и числа', 'Чтение по слогам', 'Животные', 'Простые предложения', 'Сказка: The Gingerbread Man', 'Моя комната', 'Еда', 'Счёт до 100', 'Игрушки'],
  lev: ['Олимпиадные задания', 'Фразовые глаголы', 'Чтение: научпоп', 'Синонимы и оттенки', 'Эссе на олимпиаду', 'Идиомы', 'Словообразование', 'Аудирование: лекция', 'Коллокации', 'Разбор прошлогодней олимпиады'],
};

const notes = ['Уверенно строит вопросы, путает since и for', 'Хорошо держит темп, нужна практика произношения', 'Домашнее сделано, ошибки в окончаниях', 'Лексика модуля закрепилась, словарный диктант без ошибок', 'Устал к концу, сократили чтение', 'Стал меньше бояться говорить, отвечает полными фразами', 'Читает бегло, пересказ пока по плану', 'Домашнее не сделано, повторили на занятии'];

// Сколько занятий должно остаться в абонементе: один на исходе, один в долгу
const targetBalance: Record<string, number> = { misha: 1, varya: 5, timur: -1, sonya: 3, lev: 6 };

const iso = (d: Date) => d.toISOString();

export function createSeed(now = new Date()): KabinetState {
  const week0 = startOfWeek(now);
  const lessons: Lesson[] = [];
  let n = 0;
  // Счётчик занятий ученика: темы идут по порядку, заметка через раз
  const count: Record<string, number> = {};
  for (let w = -5; w <= 2; w++) {
    for (const s of students) {
      slots[s.id].forEach(([day, h, m, minutes]) => {
        const d = addDays(week0, w * 7 + day);
        d.setHours(h, m, 0, 0);
        const past = d.getTime() + minutes * 60_000 < now.getTime();
        const t = topics[s.id];
        const k = (count[s.id] = (count[s.id] ?? -1) + 1);
        lessons.push({
          id: `l${++n}`,
          studentId: s.id,
          start: iso(d),
          minutes,
          topic: t[k % t.length],
          status: past ? 'done' : 'planned',
          note: past && k % 2 === 1 ? notes[(k + n) % notes.length] : undefined,
        });
      });
    }
  }
  // Несколько живых случаев: ранняя и поздняя отмена в прошлом, перенос,
  // одно прошедшее занятие на этой неделе ещё не отмечено
  const pastDone = lessons.filter((l) => l.status === 'done');
  const early = pastDone.find((l) => l.studentId === 'varya');
  if (early) Object.assign(early, { status: 'cancelled', charged: false, note: 'Отменили за два дня, заболела' });
  const late = pastDone.find((l) => l.studentId === 'timur' && new Date(l.start) > addDays(week0, -14));
  if (late) Object.assign(late, { status: 'cancelled', charged: true, note: 'Отмена за час до начала' });
  const moved = pastDone.find((l) => l.studentId === 'lev');
  if (moved) {
    const from = new Date(moved.start);
    moved.movedFrom = iso(new Date(from.getTime() - 24 * 3_600_000));
  }
  const thisWeekPast = pastDone.filter((l) => new Date(l.start) >= week0);
  const unmarked = thisWeekPast[thisWeekPast.length - 1];
  if (unmarked) Object.assign(unmarked, { status: 'planned', note: undefined });

  // Оплаты пакетами по 8 занятий так, чтобы остаток совпал с целевым
  const payments: Payment[] = [];
  let p = 0;
  for (const s of students) {
    const spent = lessons.filter((l) => l.studentId === s.id && isCharged(l)).length;
    let left = spent + targetBalance[s.id];
    let w = -6;
    while (left > 0) {
      const size = left >= 8 ? 8 : left;
      const d = addDays(week0, w * 7 + 1);
      d.setHours(20, 15, 0, 0);
      payments.push({ id: `p${++p}`, studentId: s.id, date: iso(d), lessons: size, amount: size * s.pricePerLesson });
      left -= size;
      w += 3;
    }
  }

  // Открытый запрос родителя на перенос ближайшего занятия Миши
  const nextMisha = lessons.find((l) => l.studentId === 'misha' && l.status === 'planned' && new Date(l.start) > now);
  const requests = nextMisha
    ? [{ id: 'r1', lessonId: nextMisha.id, studentId: 'misha', wish: 'Можно перенести на следующий день, в это же время? У Миши соревнования.', createdAt: iso(now), status: 'open' as const }]
    : [];

  const trialAt = addDays(week0, 10);
  trialAt.setHours(19, 0, 0, 0);
  return {
    version: STATE_VERSION,
    tutor: { name: 'Ирина', subject: 'английский язык' },
    students,
    lessons,
    payments: payments.sort((a, b) => b.date.localeCompare(a.date)),
    trials: [
      { id: 't1', childName: 'Алиса', grade: '6 класс', parent: { name: 'Марина', phone: '+7 900 000-00-21' }, goal: 'Отстаёт по школьной программе', status: 'new' },
      { id: 't2', childName: 'Глеб', grade: '9 класс', parent: { name: 'Павел', phone: '+7 900 000-00-22' }, goal: 'ОГЭ через полгода', status: 'scheduled', at: iso(trialAt) },
      { id: 't3', childName: 'Ника', grade: '2 класс', parent: { name: 'Дарья', phone: '+7 900 000-00-23' }, goal: 'Знакомство с языком', status: 'declined' },
    ],
    requests,
    settings: { freeCancelHours: 24, dayStart: 9, dayEnd: 21 },
  };
}
