import { sx, style } from '../../design-tokens';

export const button = style({
  background: 'none',
  appearance: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
});

export const ticker = sx({
  color: '$bundle_input_primary_label_color',
});

export const chevronIcon = sx({
  w: '$16',
  h: '$16',
  marginLeft: '$8',
});
