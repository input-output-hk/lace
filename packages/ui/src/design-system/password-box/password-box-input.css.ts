import { globalStyle, vars, style } from '../../design-tokens';

export const root = style({
  position: 'relative',
  width: vars.spacing.$fill,
});

export const container = style({
  background: vars.colors.$input_container_bgColor,
  paddingBottom: vars.spacing.$6,
  paddingTop: vars.spacing.$6,
  paddingRight: vars.spacing.$6,
  borderRadius: vars.radius.$medium,
  width: vars.spacing.$fill,
  position: 'relative',

  ':hover': {
    outline: `1px solid ${vars.colors.$input_container_hover_outline_color}`,
  },
});

export const disabledContainer = style({
  ':hover': {
    outline: 'none',
  },
});

export const input = style({
  width: 'calc(100% - 90px)',
  position: 'relative',
  top: '6px',
  fontSize: vars.fontSizes.$18,
  fontFamily: vars.fontFamily.$nova,
  padding: `${vars.spacing.$10} ${vars.spacing.$20}`,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: vars.colors.$input_value_color,
  fontWeight: vars.fontWeights.$semibold,

  ':disabled': {
    opacity: vars.opacities.$0_5,
  },
});

export const largeDots = style({
  fontFamily: vars.fontFamily.$verdana,
  fontSize: '17.8px',
  paddingTop: '15px',
});

export const label = style({
  position: 'absolute',
  left: vars.spacing.$20,
  transitionDuration: '0.2s',
  pointerEvents: 'none',
  fontFamily: vars.fontFamily.$nova,
  color: vars.colors.$input_label_color,
  fontSize: vars.fontSizes.$18,
  fontWeight: vars.fontWeights.$semibold,
});

export const disabledLabel = style({
  opacity: vars.opacities.$0_5,
});

export const errorMessage = style({
  position: 'absolute', // required to not change the overall height of the password box (causing jumping)
  bottom: '-20px', // not sure how to use negative values of spacing vars
  color: vars.colors.$input_error_message_color,
  marginLeft: vars.spacing.$20,
  fontWeight: vars.fontWeights.$semibold,
});

globalStyle(
  `${input}:focus + ${label}, ${input}:not(:placeholder-shown) + ${label}`,
  {
    top: '0px',
    fontSize: vars.fontSizes.$12,
  },
);

globalStyle(`${container}:has(${input}:focus)`, {
  outline: `1px solid ${vars.colors.$input_container_focused_outline_color}`,
});
