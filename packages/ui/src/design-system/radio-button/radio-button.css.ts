import { style, sx, vars } from '../../design-tokens';

export const radioGroupRoot = style([
  sx({
    display: 'flex',
    flexDirection: 'column',
    gap: '$10',
    margin: '$0',
  }),
  {
    fontFamily: vars.fontFamily.$nova,
    fontWeight: vars.fontWeights.$semibold,
  },
]);

export const radioGroupItem = style([
  sx({
    width: '$24',
    height: '$24',
    padding: '$0',
    borderRadius: '$circle',
  }),
  {
    background: vars.colors.$radiobutton_indicator_check_color,

    ':focus': {
      backgroundColor: vars.colors.$radiobutton_focus_color,
    },

    ':hover': {
      border: `1px solid ${vars.colors.$radiobutton_hover_color}`,
    },

    ':disabled': {
      cursor: 'not-allowed',
      opacity: '20%',
    },
  },
]);

export const radioGroupIndicator = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$circle',
  }),
  {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: vars.colors.$radiobutton_indicator_backgroundColor,

    '::after': {
      content: '',
      display: 'block',
      width: '11px',
      height: '11px',
      borderRadius: '50%',
      backgroundColor: vars.colors.$radiobutton_indicator_check_color,
    },
  },
]);

export const icon = style([
  sx({
    borderRadius: '$tiny',
    ml: '$24',
    color: '$radiobutton_icon_color',
  }),
  {
    padding: '6px 6px 0 6px',
    border: `1px solid ${vars.colors.$radiobutton_unchecked_borderColor}`,

    ':focus': {
      backgroundColor: vars.colors.$radiobutton_focus_color,
    },

    ':hover': {
      border: `1px solid ${vars.colors.$radiobutton_icon_hover_border_color}`,
      backgroundColor: vars.colors.$radiobutton_icon_hover_color,
    },

    ':disabled': {
      cursor: 'not-allowed',
      opacity: '20%',
    },
  },
]);

export const unchecked = style({
  border: `1px solid ${vars.colors.$radiobutton_unchecked_borderColor}`,
});

export const checked = style({
  border: 0,
});

export const root = style([
  sx({
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$tiny',
  }),
  {
    display: 'inline-flex',
  },
]);

export const withLabel = style({
  padding: `${vars.spacing.$2} ${vars.spacing.$8}`,
});

export const label = style({
  fontSize: '15px',
  lineHeight: '1',
  paddingLeft: '15px',
});

export const disabled = style([
  sx({
    opacity: '$0_24',
  }),
  {
    cursor: 'not-allowed',
  },
]);
