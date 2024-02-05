import { style, sx } from '@lace/ui';
import { keyframes } from '@vanilla-extract/css';
import { theme } from '../../theme';

export const card = style([
  sx({
    boxSizing: 'border-box',
    height: '$84',
    padding: '$20',
    width: '$fill',
  }),
  {
    ':hover': {
      borderColor: theme.colors.$poolCardSelectedBorderColor,
    },
    borderWidth: 1.5,
    cursor: 'pointer',
    overflow: 'hidden',
  },
]);

export const title = style([
  sx({
    height: '$24',
    width: '$fill',
  }),
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

export const cardSelected = style({
  borderColor: theme.colors.$poolCardSelectedBorderColor,
});

const opacity = keyframes({
  '0%': { opacity: 0.5 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.5 },
});

export const skeleton = style([
  {
    ':hover': {
      border: 'none',
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: opacity,
    cursor: 'default',
  },
]);
