import { style, sx } from '../../../../design-tokens';
import { theme } from '../../../theme';

export const metric = style({
  color: theme.colors.$poolCardMetricColor,
});

export const icon = sx({
  height: '$16',
  width: '$16',
});
