import { recipe } from '@vanilla-extract/recipes';

import { sx, vars } from '../../design-tokens';

import { Variant } from './types';

export const card = recipe({
  base: sx({
    borderRadius: '$medium',
  }),
  variants: {
    variant: {
      [Variant.Elevated]: {
        backgroundColor: vars.colors.$card_elevated_backgroundColor,
        boxShadow: vars.elevation.$card,
      },
      [Variant.Greyed]: {
        backgroundColor: vars.colors.$card_greyed_backgroundColor,
      },
      [Variant.Outlined]: {
        backgroundColor: vars.colors.$card_outlined_backgroundColor,
        borderColor: vars.colors.$card_outlined_borderColor,
        borderStyle: 'solid',
        borderWidth: vars.spacing.$2,
      },
    },
  },
});
