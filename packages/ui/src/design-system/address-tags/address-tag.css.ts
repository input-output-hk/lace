import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../design-tokens';

import { AddressTagScheme } from './types';

export const card = recipe({
  base: {
    fontSize: vars.fontSizes.$12,
    fontWeight: vars.fontWeights.$medium,
    borderRadius: vars.radius.$medium,
    padding: [vars.spacing.$4, vars.spacing.$8],
  },
  variants: {
    scheme: {
      [AddressTagScheme.Own]: {
        color: vars.colors.$address_tag_own_color,
        backgroundColor: vars.colors.$address_tag_own_bgColor,
      },
      [AddressTagScheme.Handle]: {
        color: vars.colors.$address_tag_handle_color,
        backgroundColor: vars.colors.$address_tag_handle_bgColor,
      },
      [AddressTagScheme.Foreign]: {
        color: vars.colors.$address_tag_foreign_color,
        backgroundColor: vars.colors.$address_tag_foreign_bgColor,
      },
    },
  },
});
