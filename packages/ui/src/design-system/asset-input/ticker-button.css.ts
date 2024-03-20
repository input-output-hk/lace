import { sx, style } from '../../design-tokens';

export const button = style({
  background: 'none',
  appearance: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
});

export const chevronIcon = sx({
  w: '$16',
  h: '$16',
  marginLeft: '$8',
});
