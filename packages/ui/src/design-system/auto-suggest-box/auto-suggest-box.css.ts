import { vars, style, sx, globalStyle } from '../../design-tokens';

export const disabledContainer = style({
  ':hover': {
    outline: 'none',
  },
});

export const item = style([
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

export const scrollArea = style({
  background: vars.colors.$auto_suggest_container_background_color,
  padding: vars.spacing.$6,
  width: 'var(--radix-popover-trigger-width)',
  boxSizing: 'border-box',
  borderBottomRightRadius: vars.radius.$medium,
  borderBottomLeftRadius: vars.radius.$medium,
});

export const scrollAreaViewport = style({
  maxHeight: '180px',
});

export const scrollBar = style({});

export const errorMessage = style({
  color: vars.colors.$input_error_message_color,
  marginLeft: vars.spacing.$20,
});

globalStyle(`${scrollArea}:has(${scrollBar})`, {
  paddingRight: vars.spacing.$16,
});
