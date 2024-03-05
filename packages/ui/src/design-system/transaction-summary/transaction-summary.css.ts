import { sx, style } from '../../design-tokens';

export const label = sx({
  color: '$transaction_summary_label_color',
  fontWeight: '$semibold',
});

export const text = style([
  sx({
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

export const normalAmount = style([
  sx({
    color: '$transaction_summary_amount_color',
  }),
]);

export const highlightedAmount = style([
  sx({
    color: '$transaction_summary_highlighted_amount_color',
  }),
]);
