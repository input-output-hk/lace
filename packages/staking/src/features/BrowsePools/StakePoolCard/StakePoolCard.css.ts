import { style, sx } from '@lace/ui';

export const card = sx({
  display: 'flex',
  flexDirection: 'column',
  height: '$64',
  padding: '$12',
  width: '$148',
});

export const tickerName = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '72px',
});

export const firstRow = style({
  display: 'flex',
  justifyContent: 'space-between',
});
