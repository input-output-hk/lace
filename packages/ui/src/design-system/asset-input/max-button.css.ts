import { sx, style, vars } from '../../design-tokens';

export const button = style({});

export const container = style([
  sx({
    height: '$24',
    background: '$bundle_input_max_button_container_bgColor',
    borderRadius: '$small',
    minWidth: '$48',
  }),
  {
    border: 'none',
    outline: 'none',
    position: 'relative',
    zIndex: 1,
    cursor: 'pointer',
  },
]);

export const label = style([
  {
    selectors: {
      [`${button}:hover &`]: {
        color: vars.colors.$bundle_input_max_button_label_color_hover,
      },
    },
  },
]);
