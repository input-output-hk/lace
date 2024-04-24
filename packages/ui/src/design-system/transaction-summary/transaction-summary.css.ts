import { sx, style } from '../../design-tokens';

export const label = sx({
  color: '$transaction_summary_label_color',
  fontWeight: '$medium',
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
    fontWeight: '$semibold',
  }),
  {
    wordBreak: 'break-all',
  },
]);

export const tooltipIcon = style([
  sx({
    color: '$transaction_summary_label_color',
    height: '$24',
    width: '$24',
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
