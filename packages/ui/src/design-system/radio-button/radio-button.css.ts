import { style, sx, vars } from '../../design-tokens';

export const radioGroupRoot = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  fontFamily: vars.fontFamily.$nova,
  fontWeight: vars.fontWeights.$semibold,
});

export const radioGroupItem = style({
  width: '25px',
  height: '25px',
  borderRadius: '100%',
  padding: 0,
  background: 'white',

  ':focus': {
    backgroundColor: vars.colors.$radiobutton_focus_color,
  },
});

export const radioGroupIndicator = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  position: 'relative',
  borderRadius: '100%',
  backgroundColor: vars.colors.$radiobutton_indicator_backgroundColor,

  '::after': {
    content: '',
    display: 'block',
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    backgroundColor: vars.colors.$radiobutton_indicator_check_color,
  },
});

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
    cursor: 'default',
  },
]);
