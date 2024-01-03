import { style } from '@lace/ui';
import { theme } from '../../../theme';

export const wrapper = style({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.$2,
  justifyContent: 'space-between',
  width: '100%',
});

export const bar = style({
  backgroundColor: '#EFEFEF',
  borderRadius: theme.radius.$medium,
  height: '6px',
  width: '100%',
});

export const progress = style({
  borderRadius: theme.radius.$medium,
  height: '6px',
  width: theme.spacing.$28,
});

export const progressValue = style({
  color: theme.colors.$poolCardProgressBarValue,
});
