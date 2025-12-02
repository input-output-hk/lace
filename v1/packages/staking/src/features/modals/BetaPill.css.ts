import { style } from '@vanilla-extract/css';
import { theme } from '../theme';

export const root = style({
  alignItems: 'center',
  background: theme.colors.$multidelegationBetaModalPillBackground,
  borderRadius: theme.radius.$medium,
  color: theme.colors.$multidelegationBetaModalPillText,
  display: 'flex',
  fontFamily: theme.fontFamily.$nova,
  fontSize: theme.fontSizes.$12,
  fontWeight: theme.fontWeights.$semibold,
  height: theme.spacing.$20,
  justifyContent: 'center',
  width: theme.spacing.$40,
});
