import { style } from '@lace/ui';
import { theme } from '../../../theme';

export const metric = style({
  alignItems: 'center',
  color: theme.colors.$poolCardMetricColor,
  display: 'flex',
  gap: theme.spacing.$4,
});

export const metricValue = style({
  fontWeight: theme.fontWeights.$semibold,
});
