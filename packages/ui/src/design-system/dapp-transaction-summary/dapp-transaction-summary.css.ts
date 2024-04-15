import { sx, style } from '../../design-tokens';

export const transactionTypeContainer = style({
  padding: '20px 0',
});

export const adaIcon = style([
  sx({
    display: 'flex',
  }),
  {
    width: '34px',
    height: '26px',
  },
]);

export const txAmountContainer = style({
  padding: '10px 0px',
});

export const balanceDetailContainer = style({
  height: '100%',
  paddingRight: '0',
});

export const assetsContainer = style({
  padding: '10px 0px',
});

export const txSummaryContainer = style({
  paddingTop: '20px',
});
