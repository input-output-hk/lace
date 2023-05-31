import { sx, style } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
    height: '$80',
    rowGap: '$10',
  }),
  {
    display: 'grid',
    gridTemplateAreas: `
    "assetName amount"
    "balance valueInFiat"
  `,
  },
]);

export const assetNameBox = style({ gridArea: 'assetName' });

export const primaryLabel = sx({
  color: '$bundle_input_primary_label_color',
});

export const secondaryLabel = sx({
  color: '$bundle_input_secondary_label_color',
});

export const amountBox = style({ gridArea: 'amount' });

export const balance = style({ gridArea: 'balance' });

export const valueInFiat = style({ gridArea: 'valueInFiat' });

export const chevronIcon = sx({
  w: '$16',
  h: '$16',
  marginLeft: '$8',
});

export const error = sx({
  color: '$bundle_input_error_label_color',
});
