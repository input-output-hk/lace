import { style, sx } from '../../design-tokens';

export const root = style([
  sx({
    backgroundColor: '$toggle_button_group_bgColor',
    padding: '$8',
    gap: '$8',
  }),
  {
    display: 'flex',
    flexGrow: 1,
  },
]);

export const rootCompact = style({
  display: 'inline-flex',
  flexGrow: 0,
});

export const rootDisabled = style({});

export const defaultRadius = sx({
  borderRadius: '$medium',
});

export const rootSmall = style([
  sx({
    height: '$40',
    borderRadius: '$extraSmall',
    boxSizing: 'border-box',
  }),
  {
    padding: '5px',
  },
]);
