import { recipe } from '@vanilla-extract/recipes';

import { sx } from '../../design-tokens';

import type { RecipeVariants } from '@vanilla-extract/recipes';

export const grid = recipe({
  base: {
    display: 'grid',
    height: '100%',
    width: '100%',
  },

  variants: {
    columns: {
      $1: {
        gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      },
      $2: {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
      $3: {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      },
      $4: {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      },
      $5: {
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      },
      $6: {
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      },
      $7: {
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
      },
      $8: {
        gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
      },
      $none: {
        gridTemplateColumns: 'none',
      },
      $fitContent: {
        gridTemplateColumns: 'auto minmax(0, 1fr)',
      },
    },
    rows: {
      $1: {
        gridTemplateRows: 'repeat(1, minmax(0, 1fr))',
      },
      $2: {
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
      },
      $3: {
        gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
      },
      $4: {
        gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
      },
      $5: {
        gridTemplateRows: 'repeat(5, minmax(0, 1fr))',
      },
      $6: {
        gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
      },
      $7: {
        gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
      },
      $8: {
        gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
      },
      $none: {
        gridTemplateRows: 'none',
      },
      $fitContent: {
        gridTemplateRows: 'auto minmax(0, 1fr)',
      },
    },
    gutters: {
      $0: sx({ gap: '$0' }),
      $8: sx({ gap: '$8' }),
      $16: sx({ gap: '$16' }),
      $20: sx({ gap: '$20' }),
      $32: sx({ gap: '$32' }),
    },
    alignItems: {
      $center: {
        alignItems: 'center',
      },
      $fleStart: {
        alignItems: 'flex-start',
      },
      $flexEnd: {
        alignItems: 'flex-end',
      },
      $baseline: {
        alignItems: 'baseline',
      },
      $stretch: {
        alignItems: 'stretch',
      },
    },
  },

  defaultVariants: {
    columns: '$none',
    rows: '$none',
    gutters: '$20',
  },
});

export type GridVariants = Required<NonNullable<RecipeVariants<typeof grid>>>;
