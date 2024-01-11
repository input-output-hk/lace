import { style, sx } from '@lace/ui';
import { theme } from '../../../theme';

export const wrapper = sx({
  width: '$fill',
});

export const bar = style([
  sx({
    borderRadius: '$medium',
    height: '$4',
    width: '$fill',
  }),
  {
    backgroundColor: theme.colors.$poolCardProgressBarBaseBackgroundColor,
  },
]);

export const progress = sx({
  borderRadius: '$medium',
  height: '$4',
});

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
});

export const progressLow = sx({
  backgroundColor: '$data_blue',
});
export const progressMedium = sx({
  backgroundColor: '$data_green',
});
export const progressHigh = sx({
  backgroundColor: '$data_yellow',
});
export const progressVeryHigh = sx({
  backgroundColor: '$data_orange',
});
export const progressOversaturated = sx({
  backgroundColor: '$data_pink',
});
