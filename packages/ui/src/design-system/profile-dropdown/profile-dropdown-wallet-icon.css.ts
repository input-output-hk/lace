import { sx, style, createVar, recipe } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = recipe({
  base: style([
    sx({
      w: '$32',
      h: '$32',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '$extraSmall',
      fontSize: '$18',
    }),
    {
      color: 'white',
    },
  ]),

  variants: {
    bg: {
      hot: sx({
        background: '$data_pink',
      }),
      cold: sx({
        background: '$data_blue',
      }),
      shared: style([
        sx({
          background: '$data_green',
        }),
        {
          fontSize: '24px',
        },
      ]),
    },
  },

  defaultVariants: {
    bg: 'hot',
  },
});

export const label = sx({ color: '$buttons_primary_label_color' });
