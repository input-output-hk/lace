import { sx, style } from '../../design-tokens';

export const transactionTypeContainer = style({
  padding: '20px 0',
});

export const cardanoIcon = style([
  sx({
    display: 'flex',
    w: '$32',
    height: '$32',
  }),
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

export const tooltipIcon = style([
  sx({
    color: '$text_primary',
    height: '$24',
    width: '$24',
  }),
]);

export const iconContainer = style({
  lineHeight: 0,
});
