import { vars, style, globalStyle } from '../../design-tokens';

import { input } from './auto-suggest-box-input.css';

export const disabledContainer = style({
  ':hover': {
    outline: 'none',
  },
});

export const container = style({
  boxSizing: 'border-box',
  justifyContent: 'center',
});

export const inputContainer = style({
  border: '2px solid transparent',
  borderRadius: vars.radius.$medium,
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'space-between',
  background: vars.colors.$auto_suggest_container_background_color,
  height: vars.spacing.$64,
  fontWeight: vars.fontWeights.$semibold,
  fontFamily: vars.fontFamily.$nova,
  position: 'relative',
  paddingLeft: vars.spacing.$24,
});

export const isSuggesting = style({
  borderRadius: vars.radius.$medium,
  borderBottomRightRadius: vars.radius.$sharp,
  borderBottomLeftRadius: vars.radius.$sharp,
  borderBottom: `2px solid ${vars.colors.$auto_suggest_border_color}`,
});

export const idle = style({});

export const popoverContent = style({
  zIndex: 1000,
});

export const selectContent = style({
  width: 'var(--radix-popper-anchor-width)',
});

export const scrollArea = style({
  background: vars.colors.$auto_suggest_container_background_color,
  padding: vars.spacing.$6,
  boxSizing: 'border-box',
  borderBottomRightRadius: vars.radius.$medium,
  borderBottomLeftRadius: vars.radius.$medium,
});

export const scrollAreaViewport = style({
  maxHeight: '180px',
});

export const scrollBar = style({
  padding: 0,
});

export const errorMessage = style({
  marginLeft: vars.spacing.$24,
  marginTop: vars.spacing.$4,
});

globalStyle(`${scrollArea}:has(${scrollBar})`, {
  paddingRight: vars.spacing.$16,
});

globalStyle(`${inputContainer}:has(${input}:disabled)`, {
  opacity: vars.opacities.$0_5,
});

globalStyle(`${inputContainer}:has(${input}:hover:not(:disabled))`, {
  border: `2px solid ${vars.colors.$auto_suggest_border_color}`,
});

globalStyle(`${inputContainer}:has(${input}:focus)`, {
  border: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
