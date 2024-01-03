import { style, sx } from '../../design-tokens';

export const root = style([
  sx({
    height: '$40',
    backgroundColor: '$toggle_button_group_bgColor',
    borderRadius: '$medium',
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
