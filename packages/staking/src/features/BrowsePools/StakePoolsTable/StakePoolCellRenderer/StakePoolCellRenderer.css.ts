import { style, sx } from '@lace/ui';
import { recipe } from '@vanilla-extract/recipes';
import { theme } from 'features/theme';
import type { RecipeVariants } from '@vanilla-extract/recipes';

export const dotWrapper = style([
  {
    alignItems: 'center',
    display: 'flex',
  },
]);

export const dot = recipe({
  base: [
    {
      borderRadius: theme.radius.$circle,
      display: 'flex',
      height: '7px',
      marginRight: theme.spacing.$6,
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
