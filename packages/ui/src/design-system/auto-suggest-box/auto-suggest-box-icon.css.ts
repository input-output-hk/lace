import { style, sx } from '../../design-tokens';

export const icon = style([
  sx({
    mr: '$16',
    w: '$24',
    h: '$24',
  }),
  {
    fontSize: '24px',
    visibility: 'hidden',
  },
]);

export const loader = style([
  sx({
    color: '$auto_suggest_loader_color',
  }),
]);

export const check = style([
  sx({
    color: '$auto_suggest_check_color',
  }),
]);

export const visible = style({
  visibility: 'visible',
});
