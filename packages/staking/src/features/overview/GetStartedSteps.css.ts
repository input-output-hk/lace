import { style } from '@vanilla-extract/css';
import { vars } from '../../design-tokens';
import { theme } from '../theme';

export const stepCircle = style({
  alignItems: 'center',
  background: theme.colors.$getStartedStepFillColor,
  border: `2px solid ${theme.colors.$getStartedStepBorderColor}`,
  borderRadius: '50%',
  display: 'flex',
  height: theme.spacing.$48,
  justifyContent: 'center',
  lineHeight: 0,
  width: theme.spacing.$48,
});

export const stepCircleNumber = style({
  background: theme.colors.$getStartedStepNumberColor,
  backgroundClip: 'text',
  fontFamily: vars.fontFamily.$nova,
  fontSize: theme.fontSizes.$18,
  fontWeight: theme.fontWeights.$bold,
  paddingBottom: '50%',
  paddingTop: '50%',
  // note: not sure why, but webkit props need to come after background
  // otherwise the number shown will be corrupted (rectangle instead of number)
  // eslint-disable-next-line unicorn/no-useless-spread
  ...{
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
});

export const stepDescription = style({
  color: theme.colors.$getStartedStepDescriptionColor,
});
