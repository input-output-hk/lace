import { vars, style, sx, globalStyle } from '../../design-tokens';

import { input } from './auto-suggest-box-input.css';

export const disabledContainer = style({
  ':hover': {
    outline: 'none',
  },
});

export const container = style({
  boxSizing: 'border-box',
  border: '2px solid transparent',
  background: vars.colors.$input_container_bgColor,
  height: vars.spacing.$64,
  borderRadius: vars.radius.$medium,
  fontWeight: vars.fontWeights.$semibold,
  fontFamily: vars.fontFamily.$nova,
  alignItems: 'center',
  position: 'relative',
  width: '100%',
});

export const isSuggesting = style({
  border: 'solid 2px transparent',
  borderBottomRightRadius: vars.radius.$sharp,
  borderBottomLeftRadius: vars.radius.$sharp,
  borderBottomColor: vars.colors.$auto_suggest_border_color,
});

export const popover = style({
  zIndex: 10,
});

export const suggestion = style([
  sx({
    p: '$16',
  }),
  {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: vars.colors.$auto_suggest_border_color,
      borderRadius: vars.radius.$medium,
    },
    ':focus': {
      backgroundColor: vars.colors.$auto_suggest_border_color,
      borderRadius: vars.radius.$medium,
      outline: 'none',
    },
  },
]);

export const scrollArea = style({
  background: vars.colors.$auto_suggest_container_background_color,
  padding: vars.spacing.$6,
  width: 'var(--radix-popover-trigger-width)',
  boxSizing: 'border-box',
  borderBottomRightRadius: vars.radius.$medium,
  borderBottomLeftRadius: vars.radius.$medium,
});

export const scrollAreaViewport = style({
  maxHeight: '180px',
});

export const scrollBar = style({});

export const errorMessage = style({
  color: vars.colors.$input_error_message_color,
  marginLeft: vars.spacing.$24,
  marginTop: vars.spacing.$4,
});

globalStyle(`${scrollArea}:has(${scrollBar})`, {
  paddingRight: vars.spacing.$16,
});

globalStyle(`${container}:has(${input}:disabled)`, {
  opacity: vars.opacities.$0_5,
});

globalStyle(`${container}:has(${input}:hover:not(:disabled))`, {
  border: `2px solid ${vars.colors.$input_container_hover_outline_color}`,
});

globalStyle(`${container}:has(${input}:focus)`, {
  border: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
