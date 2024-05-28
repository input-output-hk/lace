import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../design-tokens';

import { Scheme } from './types';

export const card = recipe({
  base: {
    borderRadius: vars.radius.$medium,
    borderStyle: 'solid',
    borderWidth: vars.spacing.$2,
  },
  variants: {
    scheme: {
      [Scheme.Elevated]: {
        borderColor: vars.colors.$card_elevated_backgroundColor,
        backgroundColor: vars.colors.$card_elevated_backgroundColor,
        boxShadow: vars.elevation.$card,
      },
      [Scheme.Greyed]: {
        borderColor: vars.colors.$card_greyed_backgroundColor,
        backgroundColor: vars.colors.$card_greyed_backgroundColor,
      },
      [Scheme.Outlined]: {
        backgroundColor: vars.colors.$card_outlined_backgroundColor,
        borderColor: vars.colors.$card_outlined_borderColor,
        borderStyle: 'solid',
        borderWidth: vars.spacing.$2,
      },
      [Scheme.Img]: {
        borderColor: vars.colors.$card_img_borderColor,
        backgroundColor: vars.colors.$card_img_bgColor,
        borderRadius: vars.radius.$large,
      },
    },
  },
});
