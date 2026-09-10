/**
 * Deterministic sections for the ui-toolkit ActivityList render benchmark.
 *
 * These are built directly in the shape ActivityList consumes
 * (ActivitySection[] of pre-formatted ActivityCard rows) — NOT via any app's
 * grouping/formatting. That is the point of measuring here: the isolated
 * list-template render cost, decoupled from how lace-next / lace-mobile /
 * lace-extension each produce the sections. No Date.now()/Math.random(), four
 * rows per day, so grouping is fully reproducible across reassure runs.
 */
import type { ActivitySection, FormattedActivityListItem } from '../../src';

const ROWS_PER_DAY = 4;

// Fixed epoch (not Date.now()): dates must be identical across reassure runs.
// UTC arithmetic keeps output independent of the machine's timezone and rolls
// over month boundaries, so any rowCount yields valid calendar dates.
const BASE_DATE_UTC = Date.UTC(2026, 5, 1);
const MS_PER_DAY = 86_400_000;

// One of two fully-literal rows so each conforms to a single ActivityCardProps
// variant (status is the discriminant) without a type assertion.
const makeRow = (index: number): FormattedActivityListItem => {
  const amount = `${1000 + index}.${String(index % 100).padStart(2, '0')}`;
  const shared = {
    rowKey: `row-${index}`,
    id: `tx-${index}`,
    info: { subtitle: `addr_test1q${String(index).padStart(6, '0')}` },
  };
  return index % 2 === 0
    ? {
        ...shared,
        status: 'received',
        info: { ...shared.info, title: 'Receive' },
        value: {
          primaryText: `+${amount} ADA`,
          secondaryText: `$${(index * 37) % 1000}.00`,
        },
        iconName: 'ArrowDownRight',
      }
    : {
        ...shared,
        status: 'sent',
        info: { ...shared.info, title: 'Send' },
        value: {
          primaryText: `-${amount} ADA`,
          secondaryText: `$${(index * 37) % 1000}.00`,
        },
        iconName: 'ArrowUpRight',
      };
};

export const makeActivitySections = (rowCount: number): ActivitySection[] => {
  const dayCount = Math.ceil(rowCount / ROWS_PER_DAY);
  return Array.from({ length: dayCount }, (_, day) => ({
    date: new Date(BASE_DATE_UTC + day * MS_PER_DAY).toISOString().slice(0, 10),
    items: Array.from({ length: ROWS_PER_DAY }, (_, offset) =>
      makeRow(day * ROWS_PER_DAY + offset),
    ).filter((_, offset) => day * ROWS_PER_DAY + offset < rowCount),
  }));
};
