// Иконки интерфейса: тонкая линия, цвет от текста. Декоративные, подписи у кнопок свои.
const paths = {
  week: 'M4 6h16M4 6v13h16V6M8 3v4M16 3v4M4 11h16',
  students: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a5 5 0 0 0-4-5',
  payments: 'M3 7h18v12H3zM3 11h18M7 15h4',
  trials: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
  report: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  move: 'M4 12h14M13 6l6 6-6 6',
  cancel: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  reset: 'M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.4 2M18.5 9A7 7 0 0 0 6.1 7',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  plus: 'M12 5v14M5 12h14',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  close: 'M6 6l12 12M18 6L6 18',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="kb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
