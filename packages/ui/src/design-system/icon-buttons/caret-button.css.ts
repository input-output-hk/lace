import { sx, style, vars } from '../../design-tokens';

export const asc = style([]);
export const desc = style([]);

export const container = style([
  sx({
    height: '$18',
    width: '$18',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$icon_button_container_bgColor',
    borderRadius: '$tiny',
    color: '$icon_button_label_color',
    fontSize: '$12',
  }),
  {
    border: 'none',
    outline: 'none',
    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      color: vars.colors.$buttons_secondary_label_color_pressed,
    },

    selectors: {
      '&:active': {
        color: vars.colors.$buttons_secondary_label_color_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$icon_button_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
      [`&${desc}`]: {
        transform: 'rotate(180deg)',
      },
    },
  },
]);
