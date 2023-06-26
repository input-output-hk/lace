import { sx, style, vars } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    height: '$fill',
  }),
  {
    display: 'grid',
    gridTemplateAreas: `"searchIcon inputField clearButton"`,
    boxSizing: 'border-box',
  },
]);

export const button = style([
  sx({
    height: '$52',
    width: '$52',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '$search_box_clear_button_container_bgColor',
    borderRadius: '$small',
    color: '$search_box_clear_button_label_color',
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
      background: vars.colors.$search_box_clear_button_container_bgColor_hover,
      color: vars.colors.$search_box_clear_button_label_color_hover,
    },

    selectors: {
      '&:active': {
        background:
          vars.colors.$search_box_clear_button_container_bgColor_pressed,
        color: vars.colors.$search_box_clear_button_label_color_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$search_box_clear_button_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const active = sx({
  color: '$search_box_clear_button_label_color_pressed',
  background: '$search_box_clear_button_container_bgColor_pressed',
});
