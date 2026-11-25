import type { AttendanceStatus, GradeEntry } from '../types/journal';

export function gradeToNumeric(value: string): number | null {
  const map: Record<string, number> = {
    '6': 6.0,
    '6-': 5.75,
    '5+': 5.5,
    '5': 5.0,
    '5-': 4.75,
    '4+': 4.5,
    '4': 4.0,
    '4-': 3.75,
    '3+': 3.5,
    '3': 3.0,
    '3-': 2.75,
    '2+': 2.5,
    '2': 2.0,
    '2-': 1.75,
    '1+': 1.5,
    '1': 1.0,
  };
  return map[value.trim()] ?? null;
}

export function calculateWeightedAverage(grades: GradeEntry[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const g of grades) {
    if (!g.countsToAverage || g.weight <= 0) continue;
    const numeric = gradeToNumeric(g.value);
    if (numeric === null) continue;
    weightedSum += numeric * g.weight;
    totalWeight += g.weight;
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

export function formatAverage(avg: number | null): string {
  if (avg === null) return '—';
  return avg.toFixed(2).replace('.', ',');
}

export function getGradeBadgeStyle(value: string): string {
  const clean = value.trim();
  if (clean.startsWith('6') || clean.startsWith('5')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
  }
  if (clean.startsWith('4')) {
    return 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100';
  }
  if (clean.startsWith('3')) {
    return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
  }
  if (clean.startsWith('2')) {
    return 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100';
  }
  if (clean.startsWith('1')) {
    return 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100';
  }
  return 'bg-violet-50 text-violet-800 border-violet-300 hover:bg-violet-100';
}

export function getAttendanceMeta(status: AttendanceStatus): {
  label: string;
  short: string;
  className: string;
} {
  switch (status) {
    case 'ob':
      return {
        label: 'Obecność',
        short: 'ob',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'nb':
      return {
        label: 'Nieobecność nieusprawiedliwiona',
        short: 'nb',
        className: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
      };
    case 'u':
      return {
        label: 'Nieobecność usprawiedliwiona',
        short: 'u',
        className: 'bg-sky-50 text-sky-800 border-sky-200',
      };
    case 'sp':
      return {
        label: 'Spóźnienie',
        short: 'sp',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'zw':
      return {
        label: 'Zwolnienie',
        short: 'zw',
        className: 'bg-slate-100 text-slate-700 border-slate-300',
      };
  }
}

export const LESSON_HOURS: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:55', end: '09:40' },
  3: { start: '09:50', end: '10:35' },
  4: { start: '10:50', end: '11:35' },
  5: { start: '11:45', end: '12:30' },
  6: { start: '12:45', end: '13:30' },
  7: { start: '13:40', end: '14:25' },
  8: { start: '14:35', end: '15:20' },
};

export function getLessonHoursForClass(
  journal: {
    classes?: { id: string; name: string }[];
    classLessonHours?: Record<string, Record<number, { start: string; end: string }>>;
  },
  classId?: string
): Record<number, { start: string; end: string }> {
  if (!classId || !journal.classLessonHours) return LESSON_HOURS;
  const trimmed = classId.trim();
  const upper = trimmed.toUpperCase();
  const matchedCls = journal.classes?.find(
    (c) =>
      c.id === trimmed ||
      c.id.toUpperCase() === upper ||
      c.name.toUpperCase() === upper
  );
  const candidateKeys = [
    trimmed,
    upper,
    matchedCls?.id,
    matchedCls?.name,
  ].filter((k): k is string => Boolean(k));

  let custom: Record<number, { start: string; end: string }> | undefined;
  for (const key of candidateKeys) {
    if (journal.classLessonHours[key]) {
      custom = journal.classLessonHours[key];
      break;
    }
  }
  if (!custom) {
    const foundKey = Object.keys(journal.classLessonHours).find(
      (k) => k.trim().toUpperCase() === upper
    );
    if (foundKey) {
      custom = journal.classLessonHours[foundKey];
    }
  }
  if (!custom) return LESSON_HOURS;

  const merged: Record<number, { start: string; end: string }> = { ...LESSON_HOURS };
  for (const key of Object.keys(custom)) {
    const num = Number(key);
    if (custom[num]?.start && custom[num]?.end) {
      merged[num] = custom[num];
    }
  }
  return merged;
}

export const WEEKDAYS_PL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export function formatDatePl(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function formatPolishDateTime(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

export function normalizeFinalGradeDigit(raw: string): number | null {
  const cleaned = raw.trim().replace(/[+-]/g, '');
  const num = Number(cleaned);
  if (Number.isInteger(num) && num >= 1 && num <= 6) {
    return num;
  }
  return null;
}

export function numericAverageToFinalGrade(avg: number | null): number | null {
  if (avg === null) return null;
  if (avg >= 5.5) return 6;
  if (avg >= 4.65) return 5;
  if (avg >= 3.65) return 4;
  if (avg >= 2.65) return 3;
  if (avg >= 1.65) return 2;
  return 1;
}

export function gradeToOfficialWord(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'nieklasyfikowany';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'zw' || raw === 'zwolniony' || raw === 'zwolniona') return raw === 'zwolniona' ? 'zwolniona' : 'zwolniony';
  if (raw === 'nb' || raw === 'nk' || raw === 'nieklasyfikowany') return 'nieklasyfikowany';
  const digit = normalizeFinalGradeDigit(raw);
  switch (digit) {
    case 6:
      return 'celujący';
    case 5:
      return 'bardzo dobry';
    case 4:
      return 'dobry';
    case 3:
      return 'dostateczny';
    case 2:
      return 'dopuszczający';
    case 1:
      return 'niedostateczny';
    default:
      return raw;
  }
}

export function behaviorGradeToOfficialWord(grade: string): string {
  const normalized = grade.trim().toLowerCase();
  const valid = ['wzorowe', 'bardzo dobre', 'dobre', 'poprawne', 'nieodpowiednie', 'naganne'];
  return valid.includes(normalized) ? normalized : 'bardzo dobre';
}

export function qualifiesForHonors(finalDigits: (number | null)[], behaviorGrade: string): {
  qualified: boolean;
  average: number | null;
} {
  const valid = finalDigits.filter((d): d is number => d !== null);
  if (valid.length === 0) return { qualified: false, average: null };
  const hasFailing = valid.some((d) => d < 2);
  const sum = valid.reduce((a, b) => a + b, 0);
  const avg = sum / valid.length;
  const beh = behaviorGradeToOfficialWord(behaviorGrade);
  const behaviorOk = beh === 'wzorowe' || beh === 'bardzo dobre';
  return {
    qualified: !hasFailing && avg >= 4.75 && behaviorOk,
    average: avg,
  };
}

