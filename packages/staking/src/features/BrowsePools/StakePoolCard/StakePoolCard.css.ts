import { recipe } from '@vanilla-extract/recipes';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { style, sx } from '../../../design-tokens';
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

export const cardSelected = style({
  borderColor: theme.colors.$poolCardSelectedBorderColor,
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
    fade3: {
      0: style({ opacity: '0.75' }),
      1: style({ opacity: '0.5' }),
      2: style({ opacity: '0.25' }),
      3: style({ opacity: '0.5' }),
    },
    fade4: {
      0: style({ opacity: '1' }),
      1: style({ opacity: '0.75' }),
      2: style({ opacity: '0.5' }),
      3: style({ opacity: '0.25' }),
      4: style({ opacity: '0.5' }),
    },
    fade5: {
      0: style({ opacity: '1' }),
      1: style({ opacity: '0.75' }),
      2: style({ opacity: '0.5' }),
      3: style({ opacity: '0.25' }),
      4: style({ opacity: '0.5' }),
      5: style({ opacity: '0.75' }),
    },
  },
});

export type fadeVariants = Required<NonNullable<RecipeVariants<typeof skeleton>>>;
