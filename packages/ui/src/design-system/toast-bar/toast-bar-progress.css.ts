import { sx, style } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
  }),
  {
    height: '3px',
    overflow: 'hidden',
    transform: 'translateZ(0)',
    position: 'relative',
  },
]);

export const indicator = style([
  sx({
    background: '$lace_gradient',
    borderRadius: '$medium',
    width: '$fill',
    height: '$fill',
  }),
  {
    transition: 'transform 660ms cubic-bezier(0.65, 0, 0.35, 1)',
  },
]);
