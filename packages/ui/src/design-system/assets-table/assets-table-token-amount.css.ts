import { style, sx } from '../../design-tokens';

export const container = style({
  gridArea: 'tokenAmount',
});

export const amount = sx({
  color: '$assets_table_label_primary_color',
});

export const fiatPrice = sx({
  color: '$assets_table_label_secondary_color',
});
