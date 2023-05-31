import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$32',
    width: '$32',
    background: '$bundle_input_remove_button_container_bgColor',
    borderRadius: '$circle',
    boxShadow: '$assets',
  }),
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    border: 'none',
    outline: 'none',

    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background:
        vars.colors.$bundle_input_remove_button_container_bgColor_hover,
    },

    selectors: {
      '&:active': {
        background: vars.colors.$bundle_input_remove_button_container_bgColor,
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$bundle_input_remove_button_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const icon = style([
  sx({
    color: '$bundle_input_remove_button_label_color',
    width: '$16',
    height: '$16',
  }),
  {
    selectors: {
      [`${button}:hover &`]: {
        color: vars.colors.$bundle_input_remove_button_label_color_hover,
      },
      [`${button}:active &`]: {
        color: vars.colors.$bundle_input_remove_button_label_color_focused,
      },
    },
  },
]);
