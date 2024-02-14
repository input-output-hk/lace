import { sx, style } from '../../design-tokens';

export const transactionSummaryContainer = style({
  padding: '20px 0 0 0',
});

export const transactionTypeContainer = style({
  padding: '20px 0',
});

export const label = sx({
  color: '$dapp_transaction_summary_label',
  fontWeight: '$semibold',
});

export const boldLabel = style([
  sx({
    color: '$transaction_summary_label_color',
    fontWeight: '$bold',
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
    m: ['$10', '$0'],
  }),
  {
    width: '25px',
    height: '25px',
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
  padding: '0 10px',
});

export const balanceDetailContainer = style({
  height: '100%',
  paddingRight: '0',
});

export const assetsContainer = style({
  padding: '5px 10px;',
});
