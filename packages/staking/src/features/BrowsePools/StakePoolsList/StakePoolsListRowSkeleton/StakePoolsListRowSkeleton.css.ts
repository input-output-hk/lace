import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const row = style([
  sx({
    alignItems: 'center',
    display: 'grid',
    gap: '$10',
    height: '$44',
    minHeight: '$44',
  }),
  {
    flex: 1,
    gridTemplateColumns: 'repeat(auto-fit, minmax(0px, 1fr))',
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
