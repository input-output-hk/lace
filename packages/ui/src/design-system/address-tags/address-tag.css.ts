import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../design-tokens';

import { AddressTagVariants } from './types';

export const addressTag = recipe({
  base: {
    fontSize: vars.fontSizes.$12,
    fontWeight: vars.fontWeights.$medium,
    borderRadius: vars.radius.$medium,
    padding: `0 ${vars.spacing.$8}`,
    display: 'flex',
    alignItems: 'center',
    height: vars.spacing.$24,
  },
  variants: {
    scheme: {
      [AddressTagVariants.Own]: {
        color: vars.colors.$address_tag_own_color,
        backgroundColor: vars.colors.$address_tag_own_bgColor,
      },
      [AddressTagVariants.Foreign]: {
        color: vars.colors.$address_tag_foreign_color,
        backgroundColor: vars.colors.$address_tag_foreign_bgColor,
      },
    },
  },
});
