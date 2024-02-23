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

export const amountBox = style({ gridArea: 'amount' });

export const balance = style({ gridArea: 'balance' });

export const valueInFiat = style({ gridArea: 'valueInFiat' });

export const chevronIcon = sx({
  w: '$16',
  h: '$16',
  marginLeft: '$8',
});
