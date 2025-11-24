import { recipe } from '@vanilla-extract/recipes';
import { sx, theme } from 'features/theme';

export const dot = recipe({
  base: [
    {
      borderRadius: theme.radius.$circle,
      height: '7px',
      width: '7px',
    },
  ],
  variants: {
    level: {
      high: sx({ backgroundColor: '$stakePoolListCellDotHighColor' }),
      medium: sx({ backgroundColor: '$stakePoolListCellDotMediumColor' }),
      veryHigh: sx({ backgroundColor: '$stakePoolListCellDotVeryHighColor' }),
    },
  },
});
