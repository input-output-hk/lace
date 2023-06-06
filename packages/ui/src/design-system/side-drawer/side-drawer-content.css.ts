import { sx, style, keyframes, globalStyle } from '../../design-tokens';

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
    width: '$dialog',
    height: '$auto',
    zIndex: '$dialog',
    top: '$24',
    bottom: '$24',
    right: '$24',
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

export const content = style([
  sx({
    boxShadow: '$dialog',
    borderRadius: '$extraLarge',
    backgroundColor: '$side_drawer_container_bgColor',
    width: '$fill',
    height: '$fill',
    display: 'grid',
  }),
  {
    gridTemplateAreas: `
    "header"
    "body"
    "footer"`,
    gridTemplateRows: 'auto 1fr auto',
    overflow: 'hidden',
  },
]);

export const storybook = style({});

// storybook only
globalStyle(`#storybook ${storybook}`, {
  position: 'relative',
  top: 'auto',
  bottom: 'auto',
  right: 'auto',
  animation: 'none',
  height: '100%',
});
