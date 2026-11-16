const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_LABELS_MON = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Parses a Date, 'YYYY-MM-DD' string, or ISO string into a local-midnight Date
 * without UTC off-by-one-day shifts.
 */
export const parseLocalDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day);
      if (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      ) {
        return d;
      }
      return null;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }
  }
  return null;
};

/**
 * Formats a Date as 'YYYY-MM-DD' in local time.
 */
export const formatLocalDateISO = (date) => {
  const d = parseLocalDate(date);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Formats a Date for prominent display in headers (locale-aware with fallback).
 */
export const formatDisplayDate = (date, locale = 'en-US') => {
  const d = parseLocalDate(date);
  if (!d) return 'No date selected';
  try {
    return d.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return `${d.getDate()} ${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
};

export const isSameDay = (a, b) => {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export const isBeforeDay = (a, b) => {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return false;
  return da.getTime() < db.getTime();
};

export const isAfterDay = (a, b) => {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  if (!da || !db) return false;
  return da.getTime() > db.getTime();
};

export const getMonthLabel = (year, monthIndex) =>
  `${MONTH_NAMES[monthIndex]} ${year}`;

export const getWeekdayLabels = () => WEEKDAY_LABELS_MON;

/**
 * Builds a Monday-to-Sunday calendar grid for the given month.
 */
export const buildCalendarDays = (year, monthIndex) => {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Convert JS getDay() (0=Sun..6=Sat) to Monday-first offset (0=Mon..6=Sun)
  const leadingEmpty = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({ key: `empty-start-${i}`, empty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    cells.push({
      key: formatLocalDateISO(date),
      empty: false,
      day,
      date,
      iso: formatLocalDateISO(date),
    });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let i = 0; i < trailing; i++) {
      cells.push({ key: `empty-end-${i}`, empty: true });
    }
  }
  return cells;
};

export const isDateDisabled = (date, minimumDate, maximumDate, disabledDates) => {
  const d = parseLocalDate(date);
  if (!d) return true;
  if (minimumDate && isBeforeDay(d, minimumDate)) return true;
  if (maximumDate && isAfterDay(d, maximumDate)) return true;

  if (typeof disabledDates === 'function') {
    return Boolean(disabledDates(new Date(d.getTime())));
  }
  if (Array.isArray(disabledDates) && disabledDates.length > 0) {
    const iso = formatLocalDateISO(d);
    return disabledDates.some((item) => formatLocalDateISO(item) === iso);
  }
  return false;
};

/**
 * Parses '10:30 AM', '14:45', or Date into { hour24, minute }.
 */
export const parseTimeValue = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return { hour24: input.getHours(), minute: input.getMinutes() };
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (h < 1 || h > 12 || m < 0 || m > 59) return null;
      if (period === 'AM') {
        h = h === 12 ? 0 : h;
      } else {
        h = h === 12 ? 12 : h + 12;
      }
      return { hour24: h, minute: m };
    }
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return { hour24: h, minute: m };
    }
  }
  return null;
};

export const to12HourParts = (hour24) => {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
};

export const to24Hour = (hour12, period) => {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
};

export const formatTimeString = (hour24, minute, format = '12h') => {
  const mm = String(minute).padStart(2, '0');
  if (format === '24h') {
    const hh = String(hour24).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const { hour12, period } = to12HourParts(hour24);
  return `${String(hour12).padStart(2, '0')}:${mm} ${period}`;
};

export const toTotalMinutes = (hour24, minute) => hour24 * 60 + minute;

export const getMinuteOptions = (interval = 5) => {
  const validIntervals = [1, 5, 10, 15, 30];
  const step = validIntervals.includes(interval) ? interval : 5;
  const list = [];
  for (let m = 0; m < 60; m += step) {
    list.push(m);
  }
  return list;
};

export const snapMinuteToInterval = (minute, interval = 5) => {
  const opts = getMinuteOptions(interval);
  let best = opts[0];
  let minDiff = Math.abs(minute - best);
  for (const m of opts) {
    const diff = Math.abs(minute - m);
    if (diff < minDiff) {
      minDiff = diff;
      best = m;
    }
  }
  return best;
};

export const isTimeOutOfRange = (hour24, minute, minimumTime, maximumTime) => {
  const total = toTotalMinutes(hour24, minute);
  const minParsed = parseTimeValue(minimumTime);
  const maxParsed = parseTimeValue(maximumTime);
  if (minParsed && total < toTotalMinutes(minParsed.hour24, minParsed.minute)) {
    return true;
  }
  if (maxParsed && total > toTotalMinutes(maxParsed.hour24, maxParsed.minute)) {
    return true;
  }
  return false;
};

export const clampTimeToRange = (hour24, minute, minimumTime, maximumTime) => {
  let total = toTotalMinutes(hour24, minute);
  const minParsed = parseTimeValue(minimumTime);
  const maxParsed = parseTimeValue(maximumTime);
  if (minParsed) {
    const minTotal = toTotalMinutes(minParsed.hour24, minParsed.minute);
    if (total < minTotal) total = minTotal;
  }
  if (maxParsed) {
    const maxTotal = toTotalMinutes(maxParsed.hour24, maxParsed.minute);
    if (total > maxTotal) total = maxTotal;
  }
  return {
    hour24: Math.floor(total / 60),
    minute: total % 60,
  };
};

export const getPickerTheme = (theme = 'light') => {
  if (theme === 'dark') {
    return {
      isDark: true,
      overlay: 'rgba(2, 6, 23, 0.78)',
      sheetBg: '#0A0D14',
      surface: '#111827',
      surfaceAlt: '#161F33',
      border: '#1E293B',
      borderStrong: '#334155',
      primary: '#2563EB',
      primaryText: '#FFFFFF',
      primarySoft: 'rgba(37, 99, 235, 0.16)',
      primaryBorder: 'rgba(56, 189, 248, 0.35)',
      accent: '#F97316',
      accentSoft: 'rgba(249, 115, 22, 0.15)',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      disabledText: 'rgba(148, 163, 184, 0.35)',
      handle: 'rgba(148, 163, 184, 0.35)',
    };
  }
  return {
    isDark: false,
    overlay: 'rgba(15, 23, 42, 0.45)',
    sheetBg: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    primary: '#5013C7',
    primaryText: '#FFFFFF',
    primarySoft: '#F3EEFC',
    primaryBorder: 'rgba(80, 19, 199, 0.28)',
    accent: '#EA580C',
    accentSoft: '#FFF7ED',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    disabledText: '#CBD5E1',
    handle: '#CBD5E1',
  };
};
