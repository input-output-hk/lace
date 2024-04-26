import { sx, style, recipe, vars } from '../../design-tokens';

export const button = style([
  {
    border: `2px solid ${vars.colors.$profile_dropdown_wallet_status_container_borderColor}`,
  },
  sx({
    borderRadius: '$medium',
  }),
]);

export const icon = recipe({
  base: sx({
    w: '$10',
    h: '$10',
    borderRadius: '$circle',
  }),

  variants: {
    bg: {
      synced: sx({
        background: '$data_green',
      }),
      syncing: sx({
        background: '$data_yellow',
      }),
      error: sx({
        background: '$data_pink',
      }),
    },
  },

  defaultVariants: {
    bg: 'syncing',
  },
});
