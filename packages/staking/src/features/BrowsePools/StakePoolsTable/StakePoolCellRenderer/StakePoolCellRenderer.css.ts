import { style, vars } from '@lace/ui';
import { theme } from 'features/theme';

export const dotWrapper = style([
  {
    alignItems: 'center',
    display: 'flex',
  },
]);

export const dot = style([
  {
    borderRadius: theme.radius.$circle,
    display: 'flex',
    height: '7px',
    marginRight: theme.spacing.$6,
    width: '7px',
  },
]);

export const red = style([
  {
    selectors: {
      [`&${dot}`]: {
        backgroundColor: vars.colors.$data_pink,
      },
    },
  },
]);
export const orange = style([
  {
    selectors: {
      [`&${dot}`]: {
        backgroundColor: vars.colors.$data_orange,
      },
    },
  },
]);
export const yellow = style([
  {
    selectors: {
      [`&${dot}`]: {
        backgroundColor: vars.colors.$data_yellow,
      },
    },
  },
]);
export const green = style([
  {
    selectors: {
      [`&${dot}`]: {
        backgroundColor: vars.colors.$data_green,
      },
    },
  },
]);
