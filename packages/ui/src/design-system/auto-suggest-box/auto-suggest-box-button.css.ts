import { style, sx, vars } from '../../design-tokens';

export const button = style([
  sx({
    width: '$52',
    height: '$52',
    borderRadius: '$extraSmall',
    mx: '$6',
    background: '$input_button_bgColor',
    color: '$auto_suggest_address_color',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  {
    border: 'none',
    cursor: 'pointer',
    flex: 'none',
    ':disabled': {
      cursor: 'default',
    },
  },
]);

export const disabledInputButtonIcon = style({
  opacity: vars.opacities.$0_24,
});

export const icon = style([
  sx({
    width: '$24',
    height: '$24',
  }),
]);
