import { theme } from 'features/theme';
import { style } from '../../../design-tokens';

export const selectedTitle = style({
  color: theme.colors.$titleColor,
});

export const selectedPools = style([
  {
    borderBottom: `1px solid ${theme.colors.$selectedPoolsSectionBorderColor}`,
  },
]);
