import { style, sx } from '@lace/ui';

export const PoolCard = style([
  sx({
    padding: '$16',
  }),
  { flex: 1 },
]);

export const PoolHr = style({
  backgroundColor: 'var(--light-mode-light-grey-plus, var(--dark-mode-mid-grey, #333333))',
  height: '1px',
  width: '100%',
});

export const PoolIndicator = style({
  borderRadius: '0.25rem',
  height: '2.5rem',
  width: '0.25rem',
});
