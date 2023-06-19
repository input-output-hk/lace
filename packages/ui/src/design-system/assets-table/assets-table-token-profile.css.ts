import { style, sx } from '../../design-tokens';

export const container = style({
  gridArea: 'tokenProfile',
});

export const name = sx({
  color: '$assets_table_label_primary_color',
});

export const description = sx({
  color: '$assets_table_label_secondary_color',
});
