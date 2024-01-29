import { style, keyframes } from '../../design-tokens';

const rotate = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const spin = style({
  animation: `${rotate} 2s linear infinite`,
});
