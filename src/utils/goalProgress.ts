/**
 * Goal progress — how close an athlete's CURRENT value is to their goal target,
 * measured from the first logged value for that metric as the baseline.
 *
 * - higher_is_better: (current − baseline) / (target − baseline)
 * - lower_is_better:  (baseline − current) / (baseline − target)
 *
 * Clamped 0–100 so a declining athlete reads 0 (not negative). Returns null when
 * there's no data or the baseline already equals the target (progress is
 * undefined — there's no distance left to measure against).
 */
export function goalProgress(
  entries: { entry_date: string; value: number }[],
  target: number,
  higherIsBetter: boolean,
): number | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const baseline = sorted[0].value;
  const current = sorted[sorted.length - 1].value;
  const denominator = higherIsBetter ? target - baseline : baseline - target;
  if (Math.abs(denominator) < 1e-9) return null;
  const fraction = higherIsBetter
    ? (current - baseline) / denominator
    : (baseline - current) / denominator;
  return Math.round(Math.max(0, Math.min(100, fraction * 100)));
}
