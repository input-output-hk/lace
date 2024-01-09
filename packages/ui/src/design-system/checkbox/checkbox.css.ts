import { sx, style, vars, createVar } from '../../design-tokens';

export const focusBoxShadow = createVar();

export const icon = style({
  height: '14px',
  width: '14px',
});

export const label = sx({
  marginLeft: '$8',
});

export const withLabel = style({
  padding: `${vars.spacing.$2} ${vars.spacing.$8}`,
});

export const root = style([
  {
    vars: {
      [focusBoxShadow]: `0px 0px 0px 3px ${vars.colors.$checkbox_focus_color}`,
    },
  },
  sx({
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$tiny',
  }),
  {
    display: 'inline-flex',
    selectors: {
      '&:focus-within': {
        boxShadow: focusBoxShadow,
      },
    },
  },
]);

export const checkbox = style([
  sx({
    height: '$16',
    width: '$16',
    minWidth: '$16',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$tiny',
    color: '$checkbox_check_color',
    padding: '$0',
  }),
  {
    cursor: 'pointer',
    fontSize: 0,
    borderStyle: 'solid',
  },
]);

export const disabled = style([
  sx({
    opacity: '$0_24',
  }),
  {
    cursor: 'default',
  },
]);

export const checked = style([
  sx({
    borderColor: '$checkbox_checked_backgroundColor',
    backgroundColor: '$checkbox_checked_backgroundColor',
  }),
  {
    selectors: {
      '&:hover:not(:disabled)': {
        borderColor: vars.colors.$checkbox_hover_checked_backgroundColor,
        backgroundColor: vars.colors.$checkbox_hover_checked_backgroundColor,
      },
    },
  },
]);

export const unchecked = style([
  sx({
    borderColor: '$checkbox_unchecked_borderColor',
    backgroundColor: '$checkbox_unchecked_backgroundColor',
  }),
  {
    selectors: {
      '&:hover:not(:disabled)': {
        borderColor: vars.colors.$checkbox_hover_unchecked_borderColor,
        backgroundColor: vars.colors.$checkbox_hover_unchecked_backgroundColor,
      },
    },
  },
]);
