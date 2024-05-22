import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const icon = style({
  fontSize: 112,
});

export const text = style([
  sx({
    color: '$browsePoolsSearchEmptyTextColor',
    lineHeight: '$32',
  }),
  {
    marginTop: -6,
    textAlign: 'center',
  },
]);

export const wrapper = style({
  minHeight: '144px',
  position: 'absolute',
});
