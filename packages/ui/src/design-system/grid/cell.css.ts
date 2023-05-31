import { recipe } from '@vanilla-extract/recipes';

import type { RecipeVariants } from '@vanilla-extract/recipes';

export const cell = recipe({
  variants: {
    colStart: {
      $1: {
        gridColumnStart: '1',
      },
      $2: {
        gridColumnStart: '2',
      },
      $3: {
        gridColumnStart: '3',
      },
      $4: {
        gridColumnStart: '4',
      },
      $5: {
        gridColumnStart: '5',
      },
      $6: {
        gridColumnStart: '6',
      },
      $7: {
        gridColumnStart: '7',
      },
      $8: {
        gridColumnStart: '8',
      },
      $auto: {
        gridColumnStart: 'auto',
      },
    },
    colEnd: {
      $1: {
        gridColumnEnd: '1',
      },
      $2: {
        gridColumnEnd: '2',
      },
      $3: {
        gridColumnEnd: '3',
      },
      $4: {
        gridColumnEnd: '4',
      },
      $5: {
        gridColumnEnd: '5',
      },
      $6: {
        gridColumnEnd: '6',
      },
      $7: {
        gridColumnEnd: '7',
      },
      $8: {
        gridColumnEnd: '8',
      },
      $auto: {
        gridColumnEnd: 'auto',
      },
    },
    rowStart: {
      $1: {
        gridRowStart: '1',
      },
      $2: {
        gridRowStart: '2',
      },
      $3: {
        gridRowStart: '3',
      },
      $4: {
        gridRowStart: '4',
      },
      $5: {
        gridRowStart: '5',
      },
      $6: {
        gridRowStart: '6',
      },
      $7: {
        gridRowStart: '7',
      },
      $8: {
        gridRowStart: '8',
      },
      $auto: {
        gridRowStart: 'auto',
      },
    },
    rowEnd: {
      $1: {
        gridRowEnd: '1',
      },
      $2: {
        gridRowEnd: '2',
      },
      $3: {
        gridRowEnd: '3',
      },
      $4: {
        gridRowEnd: '4',
      },
      $5: {
        gridRowEnd: '5',
      },
      $6: {
        gridRowEnd: '6',
      },
      $7: {
        gridRowEnd: '7',
      },
      $8: {
        gridRowEnd: '8',
      },
      $auto: {
        gridRowEnd: 'auto',
      },
    },
  },

  defaultVariants: {
    colStart: '$auto',
    colEnd: '$auto',
  },
});

export type CellVariants = Required<NonNullable<RecipeVariants<typeof cell>>>;
