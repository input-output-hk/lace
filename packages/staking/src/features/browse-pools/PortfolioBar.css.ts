import { style, sx } from '@lace/ui';

export const barContainer = style([
  sx({
    bottom: '$24',
    left: '$24',
    padding: '$16',
    right: '$24',
  }),
  {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    position: 'fixed',
    // Sorry, had to do this, because of the side menu that has z-index: 100
    zIndex: 101,
  },
]);

export const buttons = sx({
  gap: '$16',
});

export const nextIcon = style({
  fontSize: 24,
});

export const selectedPoolsLabel = sx({ fontWeight: '$bold' });
