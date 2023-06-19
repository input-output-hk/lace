import { sx, style } from '../../design-tokens';

export const separator = style([
  sx({
    background: '$side_drawer_separator_bgColor',
    width: '$fill',
  }),
  {
    height: '1.5px',
  },
]);
