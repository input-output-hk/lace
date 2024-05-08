import { style } from '../../../../design-tokens';
import { theme } from '../../../theme';

export const inputContainer = style({
  ':hover': {
    outline: `2px solid ${theme.colors.$ratioInputContainerHoverOutlineColor}`,
  },
  alignItems: 'center',
  background: theme.colors.$ratioInputContainerBgColor,
  borderRadius: theme.radius.$medium,
  display: 'flex',
  height: theme.spacing.$48,
  justifyContent: 'center',
  width: theme.spacing.$48,
});

export const input = style({
  ':disabled': {
    opacity: theme.opacities.$0_5,
  },
  background: 'transparent',
  border: 'none',
  color: theme.colors.$ratioInputValueColor,
  fontFamily: theme.fontFamily.$nova,
  fontSize: theme.fontSizes.$18,
  fontWeight: theme.fontWeights.$semibold,
  outline: 'none',
  textAlign: 'center',
  width: '100%',
});
