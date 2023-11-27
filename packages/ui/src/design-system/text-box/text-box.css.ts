import { globalStyle, vars, style } from '../../design-tokens';

export const container = style({
  background: vars.colors.$input_container_bgColor,
  paddingTop: vars.spacing.$12,
  maxHeight: vars.spacing.$52,
  borderRadius: vars.radius.$medium,
  width: 'auto',
  fontWeight: vars.fontWeights.$semibold,
  fontFamily: vars.fontFamily.$nova,
});

export const input = style({
  width: 'calc(100% - 90px)',
  fontSize: vars.fontSizes.$18,
  padding: `${vars.spacing.$10} ${vars.spacing.$20}`,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.$input_value_color,
});

export const label = style({
  position: 'relative',
  display: 'block',
  left: vars.spacing.$20,
  top: '-40px',
  transitionDuration: '0.2s',
  pointerEvents: 'none',
  color: vars.colors.$input_label_color,
  fontSize: vars.fontSizes.$18,
});

export const errorMessage = style({
  color: vars.colors.$input_error_message_color,
  marginLeft: vars.spacing.$20,
});

globalStyle(
  `${input}:focus + ${label}, ${input}:not(:placeholder-shown) + ${label}`,
  {
    top: '-52px',
    fontSize: vars.fontSizes.$12,
  },
);

globalStyle(`${container}:has(${input}:disabled)`, {
  opacity: vars.opacities.$0_5,
});

globalStyle(`${container}:has(${input}:hover:not(:disabled))`, {
  outline: `2px solid ${vars.colors.$input_container_hover_outline_color}`,
});

globalStyle(`${container}:has(${input}:focus)`, {
  outline: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
