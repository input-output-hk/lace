import { style, vars, sx } from '../../design-tokens';

export const root = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$tiny',
  }),
]);

export const selectTrigger = style([
  sx({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '$14',
    height: '$32',
    gap: '$6',
    lineHeight: '$16',
  }),
  {
    borderRadius: '10px',
    padding: '0 15px',
    backgroundColor: vars.colors.$select_background_color,
    border: `1px solid ${vars.colors.$select_border}`,
    cursor: 'pointer',

    ':hover': {
      backgroundColor: vars.colors.$select_hover_background_color,
    },

    ':focus': {
      boxShadow: 'none',
    },

    ':focus-visible': {
      outline: 0,
    },

    ':disabled': {
      backgroundColor: vars.colors.$select_hover_background_color,
      cursor: 'not-allowed',
    },

    selectors: {
      '&[data-placeholder]': {
        color: vars.colors.$select_input_value_color,
        fontFamily: vars.fontFamily.$nova,
        fontWeight: vars.fontWeights.$semibold,
      },
    },
  },
]);

export const selectIcon = style({
  color: vars.colors.$select_icon_color,
});

export const selectContent = style({
  overflow: 'hidden',
  backgroundColor: vars.colors.$select_background_color,
  borderRadius: '6px',
});

export const selectViewport = style({
  padding: '5px',
});

export const selectItem = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    fontSize: '$14',
    height: '$24',
    lineHeight: '$16',
  }),
  {
    lineHeight: 1,
    borderRadius: '10px',
    padding: '0 35px 0 25px',
    position: 'relative',
    userSelect: 'none',
    fontFamily: vars.fontFamily.$nova,

    selectors: {
      '&[data-disabled]': {
        color: vars.colors.$radiobutton_indicator_check_color,
        pointerEvents: 'none',
      },

      '&[data-highlighted]': {
        outline: 'none',
        backgroundColor: vars.colors.$select_input_background_data_highlighted,
        color: vars.colors.$select_input_value_color,
      },
    },
  },
]);

export const selectLabel = style({
  padding: '0 25px',
  fontSize: vars.fontSizes.$12,
  lineHeight: '25px',
  color: vars.colors.$select_input_value_color,
});

export const selectItemIndicator = style([
  sx({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  {
    position: 'absolute',
    left: 0,
    width: '25px',
  },
]);

export const selectScrollButton = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '$24',
  }),
  {
    backgroundColor: vars.colors.$select_background_color,
    color: vars.colors.$select_input_background_data_highlighted,
    cursor: 'default',
  },
]);
