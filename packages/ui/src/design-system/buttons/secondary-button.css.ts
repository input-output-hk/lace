import { sx, style, vars, createVar, globalStyle } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = style([
  sx({
    background: '$buttons_secondary_container_bgColor',
    px: '$24',
    minWidth: '$116',
  }),
  {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',

    vars: {
      [borderGap]: '2px',
    },

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background: vars.colors.$buttons_secondary_container_bgColor_hover,
    },

    selectors: {
      '&:active': {
        background: vars.colors.$buttons_secondary_container_bgColor_pressed,
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$buttons_secondary_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

globalStyle(`${button} path`, {
  fill: vars.colors.$buttons_secondary_label_color,
});

globalStyle(`${button}:hover path`, {
  fill: vars.colors.$buttons_secondary_label_color_pressed,
});

globalStyle(`${button}:active path`, {
  fill: vars.colors.$buttons_secondary_label_color_pressed,
});

export const label = style([
  {
    color: vars.colors.$buttons_secondary_label_color,
    selectors: {
      [`${button}:hover &`]: {
        color: vars.colors.$buttons_secondary_label_color_pressed,
      },
      [`${button}:active &`]: {
        color: vars.colors.$buttons_secondary_label_color_pressed,
      },
    },
  },
]);
