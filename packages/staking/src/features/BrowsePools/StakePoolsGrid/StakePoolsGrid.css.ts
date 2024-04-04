import { style } from '@lace/ui';
import { sx } from 'features/theme';

// TODO use new @lace/ui Grid when available: https://input-output.atlassian.net/browse/LW-9791
export const grid = style([
  sx({
    columnGap: '$16',
    display: 'grid',
    rowGap: '$12',
  }),
  {
    '@media': {
      'screen and (min-width: 668px)': {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      },
      'screen and (min-width: 1660px)': {
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      },
    },
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
]);

// TODO export common Separator component from the @lace/ui
export const separator = sx({
  background: '$stakePoolGridSeparatorColor',
  height: '$1',
  marginBottom: '$28',
  marginTop: '$28',
  width: '$fill',
});

export const body = style([
  {
    flex: 1,
  },
]);

export const selectedTitle = sx({
  color: '$titleColor',
});
