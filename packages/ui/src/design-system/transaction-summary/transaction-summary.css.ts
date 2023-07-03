import { sx, style } from '../../design-tokens';

export const label = sx({
  color: '$transaction_summary_label_color',
  fontWeight: '$semibold',
});

export const text = style([
  sx({
    color: '$transaction_summary_label_color',
    fontWeight: '$medium',
  }),
  {
    wordBreak: 'break-all',
  },
]);

export const secondaryText = style([
  sx({
    color: '$transaction_summary_secondary_label_color',
    fontWeight: '$medium',
  }),
  {
    wordBreak: 'break-all',
  },
]);
