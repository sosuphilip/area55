import { addDays, format, parseISO } from 'date-fns';

/** "2026-08-03" -> "Aug 3" */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d');
}

/** "2026-08-03" -> "Aug 3, 2026" */
export function formatDateLong(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy');
}

/** Trim to at most maxDecimals without trailing zeros ("5.70" -> "5.7"). */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '–';
  return Number(value.toFixed(maxDecimals)).toString();
}

/** "5.7 s", "48 ml/kg/min", or just "48" when there's no unit. */
export function formatValue(value: number, unit?: string | null): string {
  const number = formatNumber(value);
  return unit ? `${number} ${unit}` : number;
}

/** ISO date (YYYY-MM-DD) for today in local time — for "defaults to today". */
export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Auto-insert '-' separators as the user types a YYYY-MM-DD date. */
export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
    .filter(Boolean)
    .join('-');
}

/** "2026-08-03" shifted by `days` (negative for the past), as YYYY-MM-DD. */
export function shiftISO(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
}

/** "+12.5%", "-3.1%", "0%" — signed percentage readout (no "-0.0%"). */
export function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0%';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}
