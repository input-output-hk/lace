import { sx, style } from '../../design-tokens';

export const text = style({
  wordBreak: 'break-all',
});

export const secondaryText = style({
  wordBreak: 'break-all',
});

export const tooltipIcon = style([
  sx({
    color: '$text_primary',
    height: '$24',
    width: '$24',
  }),
]);
