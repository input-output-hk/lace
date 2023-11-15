import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$64',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$personal_dropdown_trigger_container_bgColor',
    color: '$personal_dropdown_trigger_label_color',
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
        vars.colors.$personal_dropdown_trigger_container_bgColor_hover,
      color: vars.colors.$personal_dropdown_trigger_label_color_pressed,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$personal_dropdown_trigger_container_bgColor_pressed,
        color: vars.colors.$personal_dropdown_trigger_label_color_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$personal_dropdown_trigger_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const subtitleOffset = style({
  top: '-4px',
  position: 'relative',
});

export const title = sx({
  color: '$text_secondary',
});

export const subtitle = sx({
  color: '$text_primary',
});

export const iconButton = style({
  transform: 'scale(.5)',
});
