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

export const suggestion3Item = style([
  sx({
    justifyContent: 'space-between',
    alignItems: 'center',
  }),
  {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: vars.colors.$auto_suggest_border_color,
      borderRadius: vars.radius.$medium,
    },
  },
]);

export const suggestion3ItemCol = style([
  sx({
    alignItems: 'center',
  }),
  {
    flex: '1',
  },
]);

export const address = sx({
  color: '$auto_suggest_address_color',
});

export const initial = style([
  sx({
    height: '$40',
    width: '$40',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$circle',
    background: '$auto_suggest_initial_bgColor',
    color: '$auto_suggest_initial_color',
    mr: '$16',
  }),
  {
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
  },
]);
