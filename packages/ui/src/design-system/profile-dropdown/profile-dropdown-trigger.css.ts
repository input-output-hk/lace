import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$48',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$profile_dropdown_trigger_container_bgColor',
    borderRadius: '$medium',
    padding: '$8',
    color: '$profile_dropdown_trigger_label_color',
  }),
  {
    border: `2px solid ${vars.colors.$profile_dropdown_trigger_container_borderColor}`,
    outline: 'none',
    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background: vars.colors.$profile_dropdown_trigger_container_bgColor_hover,
      color: vars.colors.$profile_dropdown_trigger_label_color_pressed,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$profile_dropdown_trigger_container_bgColor_pressed,
        color: vars.colors.$profile_dropdown_trigger_label_color_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$profile_dropdown_trigger_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);
