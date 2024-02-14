import { style } from '@lace/ui';
import { theme } from 'features/theme';

export const selectedTitle = style({
  color: theme.colors.$titleColor,
});

export const selectedPools = style([
  {
    borderBottom: `1px solid ${theme.colors.$selectedPoolsSectionBorderColor}`,
  },
]);
