import { vars, style, sx } from '../../design-tokens';

export const suggestion = style([
  sx({
    p: '$16',
  }),
  {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: vars.colors.$auto_suggest_border_color,
      borderRadius: vars.radius.$medium,
    },
  },
]);

export const address = sx({
  color: '$auto_suggest_address_color',
});

export const initial = style([
  sx({
    height: '$40',
    width: '$40',
    borderRadius: '$circle',
    background: '$auto_suggest_initial_bgColor',
    color: '$auto_suggest_initial_color',
  }),
  {
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
  },
]);
