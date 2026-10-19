// Модель данных кабинета репетитора. Всё вымышленное, хранится в браузере.

export type LessonStatus = 'planned' | 'done' | 'cancelled';

export interface Parent {
  name: string;
  phone: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  goal: string;
  parent: Parent;
  pricePerLesson: number;
  // Цвет метки в расписании, ключ из палитры интерфейса
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'rose';
}

export interface Lesson {
  id: string;
  studentId: string;
  // Начало в формате ISO, длительность в минутах
  start: string;
  minutes: number;
  topic: string;
  status: LessonStatus;
  // Отмена списала занятие из абонемента: отменили позже срока
  charged?: boolean;
  // Откуда перенесли, если переносили
  movedFrom?: string;
  note?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  date: string;
  lessons: number;
  amount: number;
}

export type TrialStatus = 'new' | 'scheduled' | 'converted' | 'declined';

export interface Trial {
  id: string;
  childName: string;
  grade: string;
  parent: Parent;
  goal: string;
  status: TrialStatus;
  // Время пробного занятия, когда назначено
  at?: string;
  studentId?: string;
}

export interface MoveRequest {
  id: string;
  lessonId: string;
  studentId: string;
  wish: string;
  createdAt: string;
  status: 'open' | 'done' | 'declined';
}

export interface Settings {
  // За сколько часов до начала отмена ещё бесплатная
  freeCancelHours: number;
  dayStart: number;
  dayEnd: number;
}

export interface KabinetState {
  version: number;
  tutor: { name: string; subject: string };
  students: Student[];
  lessons: Lesson[];
  payments: Payment[];
  trials: Trial[];
  requests: MoveRequest[];
  settings: Settings;
}
