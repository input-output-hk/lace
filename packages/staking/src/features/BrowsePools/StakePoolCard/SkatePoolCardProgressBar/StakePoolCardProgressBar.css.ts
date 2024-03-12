import { style, sx } from '@lace/ui';
import { recipe } from '@vanilla-extract/recipes';
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

export const progress = recipe({
  base: style([
    sx({
      borderRadius: '$medium',
      height: '$4',
    }),
    {
      backgroundRepeat: 'no-repeat',
    },
  ]),
  variants: {
    level: {
      high: { backgroundImage: theme.colors.$dataOrangeGradient },
      medium: { backgroundImage: theme.colors.$dataGreenGradient },
      veryHigh: { backgroundImage: theme.colors.$dataPinkGradient },
    },
  },
});

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
});
