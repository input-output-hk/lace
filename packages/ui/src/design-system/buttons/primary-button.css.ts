import { sx, style, vars, createVar, calc } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = style([
  sx({
    background: '$buttons_primary_container_borderColor',
    px: '$24',
    minWidth: '$116',
  }),
  {
    border: 'none',
    outline: 'none',
    position: 'relative',
    zIndex: 1,
    cursor: 'pointer',

    vars: {
      [borderGap]: '2px',
    },

    ':before': {
      content: '',
      position: 'absolute',
      top: borderGap,
      right: borderGap,
      bottom: borderGap,
      left: borderGap,
      borderRadius: calc.subtract(vars.radius.$medium, borderGap),
      background: vars.colors.$buttons_primary_container_bgColor,
      zIndex: -2,
    },

    ':hover': {
      boxShadow: vars.elevation.$primaryButton,
    },

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    selectors: {
      '&:active:before': {
        background: vars.colors.$buttons_primary_container_bgColor_pressed,
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$buttons_primary_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const label = sx({ color: '$buttons_primary_label_color' });
