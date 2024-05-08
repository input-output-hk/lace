import { style } from '../../../../design-tokens';
import { theme } from '../../../theme';

export const root = style({
  border: `1px solid ${theme.colors.$preferencesPoolCardBorderColor}`,
  borderLeftWidth: 0,
  borderRightWidth: 0,
});

export const valueBox = style({
  ':last-of-type': {
    borderRightWidth: 0,
  },
  borderRight: `solid 1px ${theme.colors.$preferencesPoolCardBorderColor}`,
  flexGrow: 1,
  paddingBottom: theme.spacing.$20,
  paddingTop: theme.spacing.$16,
});

export const valueLabel = style({
  color: theme.colors.$preferencesPoolCardDataTextColor,
});

export const valueInfoIcon = style({
  color: theme.colors.$preferencesPoolCardDataIconColor,
  fontSize: theme.spacing.$24,
  marginLeft: theme.spacing.$8,
});
