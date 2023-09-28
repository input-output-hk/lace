import { style, sx } from '@lace/ui';
import { theme } from '../../../theme';

export const poolIndicator = sx({ borderRadius: '$tiny', height: '$40', width: '$4' });

export const valuesRow = style({
  borderBottomWidth: 1,
  borderColor: theme.colors.$preferencesPoolCardBorderColor,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  borderStyle: 'solid',
  borderTopWidth: 1,
  paddingBottom: theme.spacing.$20,
  paddingTop: theme.spacing.$16,
});

export const valueLabel = style({
  color: '#6F7786', // TODO
});

export const valueInfoIcon = style({
  marginLeft: theme.spacing.$8,
});
