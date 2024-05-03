import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../design-tokens';

const rootBase = style({
  display: 'flex',
  justifyContent: 'space-between',
  userSelect: 'none',
  gap: vars.spacing.$8,
  padding: vars.spacing.$16,
  lineHeight: vars.spacing.$24,
  borderRadius: vars.radius.$small,
  fontFamily: vars.fontFamily.$nova,
  fontSize: vars.fontSizes.$18,
  fontWeight: vars.fontWeights.$medium,
  color: vars.colors.$select_text_color,
  cursor: 'pointer',
  outline: 'none',

  selectors: {
    '&[data-disabled]': {
      cursor: 'not-allowed',
      opacity: vars.opacities.$0_5,
    },
  },
});

export const root = styleVariants({
  grey: [
    rootBase,
    {
      selectors: {
        '&[data-highlighted]': {
          backgroundColor: vars.colors.$select_grey_bgColor_hover,
        },
      },
    },
  ],
  outline: [
    rootBase,
    {
      selectors: {
        '&[data-highlighted]': {
          backgroundColor: vars.colors.$select_outline_bgColor_hover,
        },
      },
    },
  ],
  plain: [
    rootBase,
    {
      selectors: {
        '&[data-highlighted]': {
          backgroundColor: vars.colors.$select_plain_bgColor_hover,
        },
      },
    },
  ],
});
