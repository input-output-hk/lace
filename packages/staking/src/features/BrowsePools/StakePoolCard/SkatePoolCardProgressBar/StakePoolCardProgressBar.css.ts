import { style, sx } from '@lace/ui';
import { theme } from '../../../theme';

export const wrapper = sx({
  alignItems: 'center',
  display: 'flex',
  gap: '$10',
  justifyContent: 'space-between',
});

export const bar = style({
  backgroundColor: '#EFEFEF',
  borderRadius: theme.radius.$medium,
  height: theme.spacing.$6,
  width: '100%',
});

export const progress = sx({
  borderRadius: '$medium',
  height: '$6',
});

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
  fontWeight: 500,
});
