const NATIONAL: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 26, name: 'Republic Day' },
  { month: 3, day: 25, name: 'Holi' },
  { month: 4, day: 18, name: 'Good Friday' },
  { month: 8, day: 15, name: 'Independence Day' },
  { month: 10, day: 2, name: 'Gandhi Jayanti' },
  { month: 10, day: 12, name: 'Dussehra' },
  { month: 10, day: 29, name: 'Diwali' },
  { month: 12, day: 25, name: 'Christmas' },
];

const STATE_EXTRA: Record<string, Array<{ month: number; day: number; name: string }>> = {
  'Tamil Nadu': [
    { month: 1, day: 14, name: 'Pongal' },
    { month: 4, day: 14, name: 'Tamil New Year' },
    { month: 12, day: 5, name: 'Karthigai Deepam' },
  ],
  Karnataka: [
    { month: 11, day: 1, name: 'Rajyotsava' },
    { month: 4, day: 2, name: 'Ugadi' },
    { month: 10, day: 12, name: 'Mysuru Dasara' },
  ],
  Maharashtra: [
    { month: 4, day: 2, name: 'Gudi Padwa' },
    { month: 5, day: 1, name: 'Maharashtra Day' },
    { month: 9, day: 7, name: 'Ganesh Chaturthi' },
  ],
  Delhi: [],
  Gujarat: [
    { month: 10, day: 3, name: 'Navratri' },
    { month: 5, day: 1, name: 'Gujarat Day' },
    { month: 1, day: 14, name: 'Uttarayan' },
  ],
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function getStateHolidays(state: string, year: number): Array<{ date: string; name: string }> {
  const extras = STATE_EXTRA[state] ?? [];
  const all = [...NATIONAL, ...extras];
  return all.map((h) => ({
    date: `${year}-${pad2(h.month)}-${pad2(h.day)}`,
    name: h.name,
  }));
}

const FQ_START_MONTH: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 0 };

export function festivalHolidaysInQuarter(year: number, quarter: number, state: string): number {
  const startMonth = FQ_START_MONTH[quarter] ?? 0;
  const calYear = quarter === 4 ? year + 1 : year;
  const from = new Date(calYear, startMonth, 1);
  const to = new Date(calYear, startMonth + 3, 0);
  const holidays = getStateHolidays(state, calYear);
  return holidays.filter((h) => {
    const d = new Date(h.date);
    return d >= from && d <= to;
  }).length;
}
