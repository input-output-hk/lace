import { style, sx } from '@lace/ui';
import { theme } from '../theme';

export const tooltip = style([
  sx({
    borderRadius: '$small',
    boxShadow: '$tooltip',
    margin: '$10',
    maxWidth: '$214',
    padding: '$16',
  }),
  {
    background: theme.colors.$tooltipBgColor,
  },
]);
