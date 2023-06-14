import { sx, style } from '../../design-tokens';

export const container = style({
  gridArea: 'marketPrice',
});

export const text = sx({
  color: '$assets_table_label_primary_color',
});

export const up = sx({
  color: '$assets_table_market_price_trend_up_label_color',
});

export const down = sx({
  color: '$assets_table_market_price_trend_down_label_color',
});
