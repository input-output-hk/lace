import { vars, style, sx } from '../../design-tokens';

export const suggestion = style({
  cursor: 'pointer',
  padding: vars.spacing.$16,
  ':hover': {
    backgroundColor: vars.colors.$auto_suggest_border_color,
    borderRadius: vars.radius.$medium,
  },
  ':focus': {
    backgroundColor: vars.colors.$auto_suggest_border_color,
    borderRadius: vars.radius.$medium,
    outline: 'none',
  },
});

export const title = style({
  flex: '1',
  alignItems: 'center',
});

export const address = style({
  color: vars.colors.$auto_suggest_address_color,
  flex: '1',
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
