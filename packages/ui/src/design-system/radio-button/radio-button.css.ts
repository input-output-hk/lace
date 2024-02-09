import { style, sx, vars } from '../../design-tokens';

export const radioGroupRoot = style([
  sx({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    margin: '$0',
    w: '$fill',
  }),
  {
    fontFamily: vars.fontFamily.$nova,
    fontWeight: vars.fontWeights.$semibold,
  },
]);

export const gap = style([
  sx({
    gap: '$20',
  }),
]);

export const withIcon = style([{ minHeight: 36 }]);

export const radioGroupItem = style([
  {
    borderRadius: '50%',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 0,
    selectors: {
      '&:focus': {
        outline: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
      },
    },
  },
]);

export const indicatorWrapper = style([
  sx({
    width: '$16',
    height: '$16',
    padding: '$0',
    borderRadius: '$circle',
  }),
  {
    backgroundColor: vars.colors.$radiobutton_indicator_check_color,
    flexShrink: 0,
    flexGrow: 0,

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
    w: '$fill',
    h: '$fill',
  }),
  {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: vars.colors.$radiobutton_indicator_backgroundColor,

    '::after': {
      content: '',
      display: 'flex',
      alignSelf: 'center',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: vars.colors.$radiobutton_indicator_check_color,
    },
  },
]);

export const iconWrapper = style([
  sx({
    ml: '$18',
    justifyContent: 'flex-end',
  }),
  {
    width: 32,
    height: 32,
    flexShrink: 0,
    flexGrow: 1,
  },
]);

export const icon = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$small',
    color: '$radiobutton_icon_color',
    w: '$32',
    h: '$32',
  }),
  {
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
  border: `1px solid ${vars.colors.$radiobutton_indicator_backgroundColor}`,
});

export const root = style([
  sx({
    alignItems: 'center',
    borderRadius: '$small',
  }),
  {
    display: 'inline-flex',
  },
]);

export const withLabel = style({
  // padding: `${vars.spacing.$2} ${vars.spacing.$8}`,
  padding: `${vars.spacing.$4} ${vars.spacing.$8}`,
  borderRadius: 3,
});

export const label = style({
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
