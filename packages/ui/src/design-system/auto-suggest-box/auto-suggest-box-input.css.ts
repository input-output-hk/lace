import { vars, style, globalStyle } from '../../design-tokens';

export const input = style({
  width: '100%',
  boxSizing: 'border-box',
  fontSize: vars.fontSizes.$18,
  padding: `0 ${vars.spacing.$24}`,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.$input_value_color,
  position: 'relative',
  selectors: {
    '&:focus, &:not(:placeholder-shown)': {
      top: vars.spacing.$8,
    },
  },
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

globalStyle(`${input}:focus + ${label}, ${input}:not([value=""]) + ${label}`, {
  top: '8px',
  fontSize: vars.fontSizes.$12,
});
