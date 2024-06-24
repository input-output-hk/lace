import { recipe } from '@vanilla-extract/recipes';

import { sx } from '../../design-tokens';

import type { RecipeVariants } from '@vanilla-extract/recipes';

export const bold = sx({ fontWeight: '$bold' });

export const semibold = sx({ fontWeight: '$semibold' });

export const medium = sx({ fontWeight: '$medium' });

export const regular = sx({ fontWeight: '$regular' });

export const typography = recipe({
  base: [
    sx({ fontFamily: '$nova' }),
    {
      margin: 0,
      padding: 0,
    },
  ],
  variants: {
    type: {
      formLabel: sx({ fontSize: '$12', lineHeight: '$16' }),
      address: sx({ fontSize: '$14', lineHeight: '$17' }),
      bodySmall: sx({ fontSize: '$14', lineHeight: '$24' }),
      button: sx({
        fontSize: '$16',
        lineHeight: '$24',
        fontWeight: '$semibold',
      }),
      body: sx({ fontSize: '$16', lineHeight: '$24' }),
      bodyLarge: sx({ fontSize: '$18', lineHeight: '$24' }),
      subHeading: sx({ fontSize: '$25', lineHeight: '$32' }),
      heading: sx({ fontSize: '$32', lineHeight: '$40' }),
      pageHeading: sx({ fontSize: '$45', lineHeight: '$56' }),
      display: sx({ fontSize: '$58', lineHeight: '$64' }),
    },
    color: {
      primary: sx({ color: '$text_primary' }),
      secondary: sx({ color: '$text_secondary' }),
      accent: sx({ color: '$text_accent' }),
      highlight: sx({ color: '$data_blue' }),
      success: sx({ color: '$data_green' }),
      error: sx({ color: '$data_pink' }),
      warning: sx({ color: '$data_orange' }),
    },
  },
});

export type TypographyVariants = Required<
  NonNullable<RecipeVariants<typeof typography>>
>;
