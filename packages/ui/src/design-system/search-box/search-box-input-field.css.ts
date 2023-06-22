import { sx, style, vars } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    height: '$fill',
  }),
  {
    gridArea: 'inputField',
    boxSizing: 'border-box',
  },
]);

export const input = style([
  sx({
    width: '$fill',
    height: '$fill',
    color: '$search_box_label_color',
    fontFamily: '$nova',
    fontSize: '$18',
    lineHeight: '$24',
  }),
  {
    border: 'none',
    background: 'none',
    outline: 'none',

    '::placeholder': {
      color: vars.colors.$search_box_label_color,
      fontFamily: vars.fontFamily.$nova,
      fontSize: vars.fontSizes.$18,
      lineHeight: vars.lineHeights.$24,
    },

    ':active': {
      color: vars.colors.$search_box_label_color_pressed,
    },
  },
]);

export const active = sx({
  color: '$search_box_label_color_pressed',
});
