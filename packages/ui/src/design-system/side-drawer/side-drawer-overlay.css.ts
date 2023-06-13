import { sx, style, keyframes } from '../../design-tokens';

const overlayShow = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});

export const container = style([
  sx({
    py: '$24',
    px: '$40',
  }),
  {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    position: 'fixed',
    inset: 0,
    animation: `${overlayShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
  },
]);
