import { style, sx } from '../../design-tokens';

export const loader = style([
  sx({
    mr: '$16',
    color: '$auto_suggest_loader_color',
  }),
  {
    visibility: 'hidden',
  },
]);

export const visible = style({
  visibility: 'visible',
});
