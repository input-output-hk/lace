import { sx, style } from '../../design-tokens';

export const text = style({
  wordBreak: 'break-all',
});

export const tooltipIcon = style([
  sx({
    color: '$text_primary',
    width: '$24',
    height: '$24',
    fontSize: '$25',
  }),
]);
