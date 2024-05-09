import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { sx, theme } from 'features/theme';

export const wrapper = sx({
  width: '$fill',
});

export const bar = sx({
  backgroundColor: '$poolCardProgressBarBaseBackgroundColor',
  borderRadius: '$medium',
  height: '$4',
  width: '$fill',
});

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

export const progressValue = sx({
  color: '$poolCardProgressBarValue',
});
