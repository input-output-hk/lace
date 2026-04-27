import type { LayoutSize } from '../../design-tokens';

export type GridColumnsConfig = Partial<Record<LayoutSize, number>>;

export const DEFAULT_GRID_COLUMNS: Record<LayoutSize, number> = {
  compact: 1,
  medium: 2,
  large: 4,
};
