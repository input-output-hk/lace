import { style, sx } from '../../design-tokens';

export const container = style([
  sx({
    height: '$48',
  }),
  {
    gridArea: 'profile',
  },
]);

export const image = sx({
  mr: {
    popupScreen: '$16',
    smallScreen: '$24',
  },
});

export const name = sx({
  color: '$flow_card_label_primary_color',
});

export const description = sx({
  color: '$flow_card_label_secondary_color',
});
