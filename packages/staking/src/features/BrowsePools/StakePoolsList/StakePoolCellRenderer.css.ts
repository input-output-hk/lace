import { sx } from '@lace/ui';
import { recipe } from '@vanilla-extract/recipes';
import { theme } from 'features/theme';
import type { RecipeVariants } from '@vanilla-extract/recipes';

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

export type DotVariants = Required<NonNullable<RecipeVariants<typeof dot>>>;
