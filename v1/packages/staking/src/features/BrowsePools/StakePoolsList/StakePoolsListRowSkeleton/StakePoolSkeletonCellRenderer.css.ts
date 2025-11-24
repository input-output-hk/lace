import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { sx } from 'features/theme';
import type { RecipeVariants } from '@vanilla-extract/recipes';

export const cellPlaceholder = recipe({
  base: sx({
    background: '$stakePoolCellPlaceholder',
    borderRadius: '$medium',
  }),
  variants: {
    fade: {
      0: style({ opacity: '0.7' }),
      1: style({ opacity: '0.6' }),
      2: style({ opacity: '0.5' }),
      3: style({ opacity: '0.4' }),
      4: style({ opacity: '0.3' }),
      5: style({ opacity: '0.2' }),
      6: style({ opacity: '0.3' }),
      7: style({ opacity: '0.4' }),
      8: style({ opacity: '0.5' }),
      9: style({ opacity: '0.6' }),
    },
  },
});

export type fadeVariants = Required<NonNullable<RecipeVariants<typeof cellPlaceholder>>>;
