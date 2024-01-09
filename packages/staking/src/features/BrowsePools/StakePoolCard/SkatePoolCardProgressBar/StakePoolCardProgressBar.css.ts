import { style, sx } from '@lace/ui';
import { theme } from '../../../theme';

export const bar = style({
  backgroundColor: '#EFEFEF',
  borderRadius: theme.radius.$medium,
  height: theme.spacing.$6,
  width: '100%',
});

export const progress = sx({
  borderRadius: '$medium',
  height: '$6',
});

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
});

export const progress20 = sx({
  backgroundColor: '$data_blue',
});
export const progress69 = sx({
  backgroundColor: '$data_green',
});
export const progress90 = sx({
  backgroundColor: '$data_yellow',
});
export const progress100 = sx({
  backgroundColor: '$data_orange',
});
export const progressOversaturated = sx({
  backgroundColor: '$data_pink',
});
