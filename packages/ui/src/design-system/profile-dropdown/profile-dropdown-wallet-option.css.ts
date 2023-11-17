import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$48',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$transparent',
    borderRadius: '$small',
    color: '$profile_dropdown_wallet_option_label_color',
    px: '$8',
    py: '$16',
    width: '$fill',
  }),
  {
    border: `none`,
    outline: 'none',
    cursor: 'pointer',

    ':disabled': {
      opacity: vars.opacities.$0_24,
    },

    ':hover': {
      background:
        vars.colors.$profile_dropdown_wallet_option_container_bgColor_hover,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$profile_dropdown_wallet_option_container_bgColor_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$profile_dropdown_trigger_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const icon = style({});
