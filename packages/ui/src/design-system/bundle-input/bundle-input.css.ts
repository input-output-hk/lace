import { sx, style, calc, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$584',
    px: '$32',
    py: '$24',
    rowGap: '$10',
    background: '$bundle_input_container_bgColor',
    borderRadius: '$medium',
  }),
]);

export const itemBox = style({
  position: 'relative',
});

export const removeButtonBox = style([
  sx({
    top: '$16',
  }),
  {
    position: 'absolute',
    right: calc.multiply(vars.spacing.$48, -1),
  },
]);

export const icon = style({
  maxWidth: '$12',
  maxHeight: '$12',
});
