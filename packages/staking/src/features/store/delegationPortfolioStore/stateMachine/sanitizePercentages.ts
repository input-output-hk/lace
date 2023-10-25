// If percentages add up to 100, normalize them. Otherwise, round them to N decimal places.
// The latter occurs when there are funds on non-delegated addresses.
import { PERCENTAGE_SCALE_MAX } from '../constants';
import { normalizePercentages, sumPercentagesSanitized } from './index';

export const sanitizePercentages = <K extends string, T extends { [key in K]: number }>({
  items,
  key,
  decimals = 0,
}: {
  items: T[];
  key: K;
  decimals?: number;
}) =>
  sumPercentagesSanitized({ items, key }) === PERCENTAGE_SCALE_MAX
    ? normalizePercentages({
        decimals,
        items,
        key,
      })
    : items.map((item) => ({
        ...item,
        [key]: Number(item[key].toFixed(decimals)),
      }));
