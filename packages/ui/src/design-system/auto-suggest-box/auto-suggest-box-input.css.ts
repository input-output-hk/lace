import { vars, style, globalStyle } from '../../design-tokens';

export const container = style({
  width: '100%',
  boxSizing: 'border-box',
  border: '2px solid transparent',
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

export const isSuggesting = style({
  border: 'solid 2px transparent',
  borderBottomRightRadius: vars.radius.$sharp,
  borderBottomLeftRadius: vars.radius.$sharp,
  borderBottomColor: vars.colors.$auto_suggest_border_color,
  borderBottomStyle: 'solid',
  borderBottomWidth: '2px',
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
  border: `2px solid ${vars.colors.$input_container_hover_outline_color}`,
});

globalStyle(`${container}:has(${input}:focus)`, {
  border: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
