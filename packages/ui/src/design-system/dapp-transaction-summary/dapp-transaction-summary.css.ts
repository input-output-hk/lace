import { sx, style } from '../../design-tokens';

export const label = sx({
  color: '$dapp_transaction_summary_label',
  fontWeight: '$semibold',
});

export const boldLabel = sx({
  color: '$transaction_summary_label_color',
  fontWeight: '$bold',
});

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
    p: ['$0', '$10'],
  }),
  {
    width: '25px',
    height: '25px',
  },
]);

export const avatarRoot = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  verticalAlign: 'middle',
  overflow: 'hidden',
  userSelect: 'none',
  width: '45px',
  height: '45px',
  borderRadius: '5px',
  backgroundColor: '$transaction_summary_secondary_label_color',
});

export const avatarImage = style({
  width: '70%',
  height: '70%',
  objectFit: 'cover',
  borderRadius: 'inherit',
});
