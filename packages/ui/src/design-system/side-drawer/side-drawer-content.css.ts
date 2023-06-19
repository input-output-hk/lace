import { sx, style, keyframes } from '../../design-tokens';

const slideIn = keyframes({
  from: {
    transform: 'translateX(105%)',
  },
  to: {
    transform: 'translateX(0%)',
  },
});

const slideOut = keyframes({
  from: {
    transform: 'translateX(0%)',
  },
  to: {
    transform: 'translateX(105%)',
  },
});

export const container = style([
  sx({
    top: '$24',
    bottom: '$24',
    right: '$24',
    width: '$dialog',
    height: '$auto',
  }),
  {
    position: 'fixed',

    selectors: {
      '&[data-state="open"]': {
        animation: `${slideIn} 300ms ease-out forwards`,
      },
      '&[data-state="closed"]': {
        animation: `${slideOut} 300ms ease-in forwards`,
      },
    },
  },
]);
