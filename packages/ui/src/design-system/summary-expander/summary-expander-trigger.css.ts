import { sx, style, vars } from '../../design-tokens';

export const container = style([
  sx({
    height: '$32',
    width: '$32',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$summary_expander_trigger_container_bgColor',
    borderRadius: '$extraSmall',
    color: '$summary_expander_trigger_label_color',
    fontSize: '$16',
  }),
  {
    border: `${vars.spacing.$1} solid ${vars.colors.$summary_expander_trigger_container_borderColor}`,
    outline: 'none',
    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background: vars.colors.$summary_expander_trigger_container_bgColor_hover,
      color: vars.colors.$buttons_secondary_label_color_pressed,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$summary_expander_trigger_container_bgColor_pressed,
        color: vars.colors.$buttons_secondary_label_color_pressed,
        borderColor:
          vars.colors.$summary_expander_trigger_container_bgColor_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$summary_expander_trigger_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);
