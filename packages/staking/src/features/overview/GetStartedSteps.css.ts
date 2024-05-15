import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const stepCircle = style([
  sx({
    alignItems: 'center',
    background: '$getStartedStepFillColor',
    borderColor: '$getStartedStepBorderColor',
    display: 'flex',
    height: '$48',
    justifyContent: 'center',
    width: '$48',
  }),
  {
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 2,
    lineHeight: 0,
  },
]);

export const stepCircleNumber = style([
  sx({
    background: '$getStartedStepNumberColor',
    fontFamily: '$nova',
    fontSize: '$18',
    fontWeight: '$bold',
  }),
  {
    backgroundClip: 'text',
    paddingBottom: '50%',
    paddingTop: '50%',
    // note: not sure why, but webkit props need to come after background
    // otherwise the number shown will be corrupted (rectangle instead of number)
    // eslint-disable-next-line unicorn/no-useless-spread
    ...{
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
]);

export const stepDescription = sx({
  color: '$getStartedStepDescriptionColor',
});
