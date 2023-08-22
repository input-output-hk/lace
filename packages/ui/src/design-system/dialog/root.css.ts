import { style } from '../../design-tokens';

export const dialogOverlay = style({
  position: 'fixed',
  inset: 0,
});

export const dialogContent = style({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});
