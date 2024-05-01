import { globalStyle, vars, style } from '../../design-tokens';

export const container = style({
  background: vars.colors.$input_container_bgColor,
  height: vars.spacing.$64,
  borderRadius: vars.radius.$medium,
  fontWeight: vars.fontWeights.$semibold,
  fontFamily: vars.fontFamily.$nova,
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
});

export const input = style({
  width: '100%',
  fontSize: vars.fontSizes.$18,
  padding: `0 ${vars.spacing.$28}`,
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
  left: vars.spacing.$28,
  top: '18px',
  transitionDuration: '0.2s',
  pointerEvents: 'none',
  color: vars.colors.$input_label_color,
  fontSize: vars.fontSizes.$18,
});

export const errorMessage = style({
  marginLeft: vars.spacing.$20,
});

globalStyle(
  `${input}:focus + ${label}, ${input}:not(:placeholder-shown) + ${label}`,
  {
    top: '8px',
    fontSize: vars.fontSizes.$12,
  },
);

globalStyle(`${container}:has(${input}:disabled)`, {
  opacity: vars.opacities.$0_5,
});

globalStyle(`${container}:has(${input}:hover:not(:disabled))`, {
  outline: `2px solid ${vars.colors.$input_container_hover_outline_color}`,
  outlineOffset: -2,
});

globalStyle(`${container}:has(${input}:focus)`, {
  outline: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
  outlineOffset: -3,
});
