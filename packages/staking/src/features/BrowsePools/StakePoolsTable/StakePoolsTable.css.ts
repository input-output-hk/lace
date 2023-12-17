import { style } from '@lace/ui';
const minimumScreenSize = '668px';

export const stakePoolsTable = style([
  {
    '@media': {
      [`screen and (min-width: ${minimumScreenSize})`]: {
        alignItems: 'stretch',
        display: 'flex',
        flexDirection: 'column',
      },
    },
  },
]);
