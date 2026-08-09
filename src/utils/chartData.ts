import { formatDate } from '@/utils/format';

export type ChartPoint = { value: number; label: string };

/** Entries -> ascending [{ value, label }] for react-native-gifted-charts. */
export function toChartData(
  entries: { entry_date: string; value: number }[],
): ChartPoint[] {
  return [...entries]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({ value: e.value, label: formatDate(e.entry_date) }));
}
