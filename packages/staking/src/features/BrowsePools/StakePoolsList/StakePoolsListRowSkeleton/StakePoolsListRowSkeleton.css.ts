import { style, sx, vars } from '../../../../design-tokens';

export const row = style([
  {
    alignItems: 'center',
    display: 'grid',
    flex: '1',
    gap: vars.spacing.$10,
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
  sx({
    pl: '$8',
  }),
  {
    selectors: {
      [`${selectable} &:first-child`]: {
        justifyContent: 'flex-end',
        padding: 0,
      },
    },
  },
]);
