import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';
import { theme } from '../theme';
const minimumScreenSize = '668px';

export const barContainer = style([
  sx({
    bottom: '$24',
    left: '$24',
    padding: '$16',
    right: '$24',
  }),
  {
    '@media': {
      [`screen and (max-width: ${minimumScreenSize})`]: {
        minWidth: theme.spacing.$420,
      },
    },
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    position: 'fixed',
    // Sorry, had to do this, because of the side menu that has z-index: 100
    zIndex: 101,
  },
]);

export const nextIcon = style({
  fontSize: 24,
});
