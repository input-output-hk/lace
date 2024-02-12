// TODO: remove once replaced with new pool skeleton (LW-9659)
import { style, vars } from '@lace/ui';

export const row = style([
  {
    alignItems: 'center',
    display: 'grid',
    flex: '1',
    gap: '7px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(0px, 1fr))',
    height: vars.spacing.$44,
    minHeight: vars.spacing.$44,
  },
]);

export const selectable = style([
  {
    selectors: {
      [`&${row}`]: {
        gridTemplateColumns: '28px repeat(auto-fit, minmax(0px, 1fr))',
      },
    },
  },
]);

export const cell = style([
  {
    display: 'flex',
    selectors: {
      [`${selectable} &:first-child`]: {
        justifyContent: 'flex-end',
        padding: 0,
      },
    },
  },
]);
