import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { sx } from 'features/theme';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { theme } from '../../theme';
import { STAKE_POOL_CARD_HEIGHT } from './constants';

export const card = style([
  sx({
    boxSizing: 'border-box',
    height: `$${STAKE_POOL_CARD_HEIGHT}`,
    padding: '$20',
    width: '$fill',
  }),
  {
    ':hover': {
      borderColor: theme.colors.$poolCardSelectedBorderColor,
    },
    borderWidth: 1.5,
    cursor: 'pointer',
    overflow: 'hidden',
  },
]);

export const title = style([
  sx({
    height: '$24',
    width: '$fill',
  }),
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

export const cardSelected = sx({
  borderColor: '$poolCardSelectedBorderColor',
});

export const skeleton = recipe({
  base: [
    {
      ':hover': {
        border: 'none',
      },
      cursor: 'default',
    },
  ],
  variants: {
    fade2: {
      0: style({ opacity: '1' }),
      1: style({ opacity: '0.75' }),
    },
    fade3: {
      0: style({ opacity: '1' }),
      1: style({ opacity: '0.75' }),
      2: style({ opacity: '0.5' }),
    },
    fade4: {
      0: style({ opacity: '1' }),
      1: style({ opacity: '0.75' }),
      2: style({ opacity: '0.5' }),
      3: style({ opacity: '0.25' }),
    },
  },
});

export type FadeVariant = keyof NonNullable<RecipeVariants<typeof skeleton>>;
