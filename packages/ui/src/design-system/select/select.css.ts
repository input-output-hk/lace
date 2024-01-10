import { style, vars, sx } from '../../design-tokens';

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

export const selectTrigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '10px',
  padding: '0 15px',
  fontSize: '13px',
  lineHeight: 1,
  height: '35px',
  gap: '5px',
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
});

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

export const selectItem = style({
  fontSize: '13px',
  lineHeight: 1,
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  height: '25px',
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
});

export const selectLabel = style({
  padding: '0 25px',
  fontSize: '12px',
  lineHeight: '25px',
  color: vars.colors.$select_input_value_color,
});

export const selectItemIndicator = style({
  position: 'absolute',
  left: 0,
  width: '25px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const selectScrollButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '25px',
  backgroundColor: vars.colors.$select_background_color,
  color: vars.colors.$select_input_background_data_highlighted,
  cursor: 'default',
});
