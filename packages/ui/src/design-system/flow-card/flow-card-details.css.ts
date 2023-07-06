import { style, sx } from '../../design-tokens';

export const container = style([
  sx({
    height: '$48',
  }),
  {
    gridArea: 'details',
  },
]);

export const title = sx({
  color: '$flow_card_label_primary_color',
});

export const subtitle = sx({
  color: '$flow_card_label_secondary_color',
});
