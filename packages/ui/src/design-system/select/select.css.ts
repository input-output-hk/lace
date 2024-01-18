import { style, vars, sx, createVar } from '../../design-tokens';
export const focusBoxShadow = createVar();

export const root = style([
  {
    vars: {
      [focusBoxShadow]: `0px 0px 0px 3px ${vars.colors.$select_input_focus_color}`,
    },
  },
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$extraSmall',
  }),
  {
    ':hover': {
      backgroundColor: vars.colors.$select_hover_background_color,
    },

    selectors: {
      '&:focus-within': {
        boxShadow: focusBoxShadow,
      },
    },
  },
]);

export const selectTrigger = style([
  sx({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '$18',
    gap: '$6',
    lineHeight: '$24',
    borderRadius: '$extraSmall',
  }),
  {
    padding: '16px',
    backgroundColor: vars.colors.$select_background_color,
    flex: 1,
    justifyContent: 'space-between',
    border: 0,
    cursor: 'pointer',

    ':hover': {
      backgroundColor: vars.colors.$select_hover_background_color,
    },

    ':focus': {
      boxShadow: 'focusBoxShadow',
    },

    ':focus-visible': {
      outline: 0,
    },

    ':disabled': {
      backgroundColor: vars.colors.$select_hover_background_color,
      cursor: 'not-allowed',
      opacity: '20%',
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

export const selectContent = style([
  sx({
    borderRadius: '$extraSmall',
  }),
  {
    overflow: 'hidden',
    backgroundColor: vars.colors.$select_background_color,
  },
]);

export const selectViewport = style({
  padding: '5px',
});

export const selectItem = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    fontSize: '$18',
    height: '$24',
    lineHeight: '$24',
    borderRadius: '$extraSmall',
  }),
  {
    lineHeight: 1,
    padding: '16px',
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
