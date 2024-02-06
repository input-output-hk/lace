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
      high: sx({ backgroundColor: '$data_yellow' }),
      low: sx({ backgroundColor: '$data_blue' }),
      medium: sx({ backgroundColor: '$data_green' }),
      oversaturated: sx({ backgroundColor: '$data_pink' }),
      veryHigh: sx({ backgroundColor: '$data_orange' }),
    },
  },
});

export type DotVariants = Required<NonNullable<RecipeVariants<typeof dot>>>;
