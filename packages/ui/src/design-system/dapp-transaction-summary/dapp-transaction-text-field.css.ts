import { sx, style } from '../../design-tokens';

export const label = sx({
  color: '$transaction_summary_label_color',
  fontWeight: '$bold',
});

export const text = style([
  sx({
    color: '$transaction_summary_label_color',
    fontWeight: '$semibold',
  }),
  {
    wordBreak: 'break-all',
  },
]);

export const tooltip = style([
  sx({
    color: '$transaction_summary_secondary_label_color',
    width: '$24',
    height: '$24',
    fontSize: '$25',
  }),
]);

export const tooltipText = style([
  sx({
    display: 'flex',
  }),
]);
