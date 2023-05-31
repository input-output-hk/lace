import { sx, style, vars, createVar, globalStyle } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = style([
  sx({
    height: '$48',
    background: '$control_buttons_filled_container_bgColor',
    borderRadius: '$medium',
    px: '$24',
    minWidth: '$116',
    color: '$control_buttons_filled_label_color',
  }),
  {
    border: 'none',
    outline: 'none',

    vars: {
      [borderGap]: '2px',
    },

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background: vars.colors.$control_buttons_filled_container_bgColor_hover,
      color: vars.colors.$control_buttons_filled_label_color_hover,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$control_buttons_filled_container_bgColor_pressed,
        color: vars.colors.$control_buttons_filled_label_color,
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$control_buttons_filled_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

globalStyle(`${button} svg`, {
  width: vars.spacing.$24,
  height: vars.spacing.$24,
});

export const label = style([
  sx({ color: '$control_buttons_filled_label_color' }),
  {
    selectors: {
      [`${button}:hover &`]: {
        color: vars.colors.$control_buttons_filled_label_color_hover,
      },
      [`${button}:active &`]: {
        color: vars.colors.$control_buttons_filled_label_color,
      },
    },
  },
]);
