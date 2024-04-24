import { sx, style } from '../../design-tokens';

export const transactionTypeContainer = style({
  padding: '20px 0',
});

export const label = sx({
  fontWeight: '$medium',
  color: '$transaction_summary_label_color',
});

export const positiveBalance = sx({
  color: '$dapp_transaction_summary_positive_balance_label_color',
});

export const txSummaryTitle = style([
  sx({
    color: '$transaction_summary_label_color',
    fontWeight: '$semibold',
  }),
  {
    paddingBottom: '18px',
  },
]);

export const coloredText = sx({
  color: '$dapp_transaction_summary_type_label_color',
  fontWeight: '$bold',
});

export const text = style([
  sx({
    color: '$transaction_summary_label_color',
    fontWeight: '$medium',
  }),
  {
    wordBreak: 'break-all',
  },
]);

export const secondaryText = style([
  sx({
    color: '$transaction_summary_secondary_label_color',
    fontWeight: '$medium',
  }),
  {
    wordBreak: 'break-all',
  },
]);

export const adaIcon = style([
  sx({
    display: 'flex',
  }),
  {
    width: '34px',
    height: '26px',
  },
]);

export const avatarRoot = style([
  sx({
    borderRadius: '$small',
  }),
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    overflow: 'hidden',
    userSelect: 'none',
    width: '45px',
    height: '45px',
  },
]);

export const avatarImage = style({
  width: '70%',
  height: '70%',
  objectFit: 'cover',
  borderRadius: 'inherit',
});

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
    color: '$transaction_summary_label_color',
    height: '$24',
    width: '$24',
  }),
]);
