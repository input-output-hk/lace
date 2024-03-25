import { sx } from '@lace/ui';
import { recipe } from '@vanilla-extract/recipes';
import { theme } from 'features/theme';

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
      high: sx({ backgroundColor: '$data_orange' }),
      medium: sx({ backgroundColor: '$data_green' }),
      veryHigh: sx({ backgroundColor: '$data_pink' }),
    },
  },
});
