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

export const progress = style([
  sx({
    borderRadius: '$medium',
    height: '$4',
  }),
  {
    backgroundRepeat: 'no-repeat',
  },
]);

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
});

export const progressMedium = style({
  backgroundImage: theme.colors.$dataGreenGradient,
});
export const progressHigh = style({
  backgroundImage: theme.colors.$dataOrangeGradient,
});
export const progressVeryHigh = style({
  backgroundImage: theme.colors.$dataPinkGradient,
});
