/**
 * Deterministic minimal rows for the GenericFlashList benchmark. The rows are
 * intentionally trivial (two Text lines) so the measurement isolates the list
 * wrapper's own overhead (theme lookup, extraData merge, remount-token wiring,
 * AnimatedFlashList) from any real row's render cost — real rows are guarded
 * by their own suites (tokenItem, activityList, ...).
 */
export type PerfRow = {
  id: string;
  title: string;
  subtitle: string;
};

export const makeFlashListRows = (count: number, offset = 0): PerfRow[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    title: `Row ${index}`,
    subtitle: `subtitle ${(index + offset) * 37}`,
  }));
