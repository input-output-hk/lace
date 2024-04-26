import { styleVariants } from '@vanilla-extract/css';

import { style, sx, vars } from '../../design-tokens';

const triggerBase = style({
  border: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing.$8,
  padding: `${vars.spacing.$16} ${vars.spacing.$20}`,
  borderRadius: vars.radius.$medium,
  fontFamily: vars.fontFamily.$nova,
  fontSize: vars.spacing.$18,
  lineHeight: vars.spacing.$24,
  fontWeight: vars.fontWeights.$medium,
  userSelect: 'none',
  cursor: 'pointer',

  selectors: {
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: vars.opacities.$0_5,
    },
    '&:focus-visible': {
      outline: `${vars.borders.$focused_outline} ${vars.colors.$focused_outline}`,
    },
    '&[data-placeholder]': {
      color: vars.colors.$select_placeholder_text_color,
    },
  },
});

export const trigger = styleVariants({
  grey: [
    triggerBase,
    {
      color: vars.colors.$select_text_color,
      backgroundColor: vars.colors.$select_grey_bgColor_rest,
      selectors: {
        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.$select_grey_bgColor_hover,
        },
        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.$select_grey_bgColor_pressed,
        },
      },
    },
  ],
  outline: [
    triggerBase,
    {
      backgroundColor: vars.colors.$select_outline_bgColor_rest,
      border: `1px solid ${vars.colors.$select_outline_border_color}`,
      selectors: {
        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.$select_outline_bgColor_hover,
        },
        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.$select_outline_bgColor_pressed,
        },
      },
    },
  ],
  plain: [
    triggerBase,
    {
      backgroundColor: vars.colors.$select_plain_bgColor_rest,
      selectors: {
        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.$select_plain_bgColor_hover,
        },
        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.$select_plain_bgColor_pressed,
        },
      },
    },
  ],
});

export const triggerIcon = style({
  selectors: {
    [`${triggerBase}[data-state="open"] &`]: {
      transform: 'rotate(180deg)',
    },
  },
});

const contentBase = sx({
  padding: '$4',
  borderRadius: '$medium',
  width: '$fill',
});

export const content = styleVariants({
  grey: [
    contentBase,
    {
      backgroundColor: vars.colors.$select_grey_content_bgColor,
    },
  ],
  outline: [
    contentBase,
    {
      backgroundColor: vars.colors.$select_outline_content_bgColor,
      border: `1px solid ${vars.colors.$select_outline_border_color}`,
    },
  ],
  plain: [
    contentBase,
    {
      backgroundColor: vars.colors.$select_plain_content_bgColor,
    },
  ],
});
