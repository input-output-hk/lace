import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$40',
    width: '$40',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$icon_button_container_bgColor',
    borderRadius: '$extraSmall',
    color: '$icon_button_label_color',
    fontSize: '$25',
  }),
  {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background: vars.colors.$icon_button_container_bgColor_hover,
      color: vars.colors.$buttons_secondary_label_color_pressed,
    },

    selectors: {
      '&:active': {
        background: vars.colors.$icon_button_container_bgColor_pressed,
        color: vars.colors.$buttons_secondary_label_color_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$icon_button_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);
