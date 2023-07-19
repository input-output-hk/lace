import { style, sx } from '@lace/ui';

export const PoolCard = style([
  sx({
    padding: '$16',
  }),
  { flex: 1 },
]);

export const PoolHr = style([
  sx({ height: '$1' }),
  {
    backgroundColor: 'var(--light-mode-light-grey-plus, var(--dark-mode-mid-grey, #333333))',
    width: '100%',
  },
]);

export const PoolIndicator = sx({ borderRadius: '$tiny', height: '$40', width: '$4' });
