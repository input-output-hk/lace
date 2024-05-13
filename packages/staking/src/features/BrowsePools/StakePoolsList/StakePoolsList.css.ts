import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const selectedTitle = sx({
  color: '$titleColor',
});

export const selectedPools = style([
  sx({
    borderBottomColor: '$selectedPoolsSectionBorderColor',
  }),
  {
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
]);
