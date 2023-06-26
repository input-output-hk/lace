import { sx, style } from '../../design-tokens';

export const container = style([
  sx({
    width: '$24',
    height: '$24',
    fontSize: '$18',
  }),
  {
    gridArea: 'searchIcon',
  },
]);
