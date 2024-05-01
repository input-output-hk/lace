import { sx, style, vars, createVar } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = style([
  sx({
    background: '$buttons_cta_container_bgColor',
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

    ':hover': {
      boxShadow: vars.elevation.$primaryButton,
    },

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    selectors: {
      '&:active': {
        background: vars.colors.$buttons_cta_container_bgColor_pressed,
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$buttons_cta_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const label = style({
  // this was the only way to override the `recipe` used in `text.css.ts` https://github.com/vanilla-extract-css/vanilla-extract/discussions/466
  color: vars.colors.$buttons_cta_label_color,
});
