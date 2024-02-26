import { vars, style, globalStyle } from '../../design-tokens';

import { pickedSuggesion } from './auto-suggest-box-picked-suggestion.css';

export const input = style({
  width: '100%',
  boxSizing: 'border-box',
  fontSize: vars.fontSizes.$18,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.$input_value_color,
  position: 'relative',
  pointerEvents: 'all',
  padding: '0',
});

export const label = style({
  position: 'absolute',
  display: 'block',
  left: vars.spacing.$24,
  top: vars.spacing.$18,
  transitionDuration: '0.2s',
  pointerEvents: 'none',
  color: vars.colors.$input_label_color,
  fontSize: vars.fontSizes.$18,
});

globalStyle(
  `${input}:focus + ${label},${pickedSuggesion} + ${label}, ${input}:not([value=""]) + ${label}`,
  {
    top: '8px',
    fontSize: vars.fontSizes.$12,
  },
);
