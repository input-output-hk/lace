import { styleVariants } from '@vanilla-extract/css';

import { style, sx, vars } from '../../design-tokens';

const radioItemOutlineWidth = 3;
const radioItemOutlineOffset = 4;
const radioGroupPadding = radioItemOutlineOffset + radioItemOutlineWidth;

export const radioGroupRoot = style([
  sx({
    display: 'flex',
    flexDirection: 'column',
  }),
  {
    padding: radioGroupPadding,
    fontFamily: vars.fontFamily.$nova,
    fontWeight: vars.fontWeights.$semibold,
    flexGrow: 1,
  },
]);

export const radioGroupItemWrapper = style({
  minHeight: 40,
});

export const radioGroupIndicatorWrapper = style([
  {
    display: 'flex',
    flexShrink: 0,
    width: vars.spacing.$20,
    height: vars.spacing.$20,
    padding: vars.spacing.$0,
    borderRadius: vars.radius.$circle,
    background: vars.colors.$radiobutton_unchecked_bgColor,
    border: `1px solid ${vars.colors.$radiobutton_unchecked_borderColor}`,
    position: 'relative',
    outline: 'none',

    ':hover': {
      border: `1px solid ${vars.colors.$radiobutton_hover_color}`,
      background: vars.colors.$radiobutton_checked_bgColor,
    },

    ':disabled': {
      cursor: 'not-allowed',
      opacity: '20%',
    },

    selectors: {
      '&[data-state=checked]': {
        border: 'none',
      },
    },
  },
]);

const defaultStyle = style({
  borderRadius: vars.radius.$circle,
  selectors: {
    [`&:has(${radioGroupIndicatorWrapper}:focus-visible)`]: {
      outlineColor: vars.colors.$radiobutton_focus_color,
      outlineWidth: 3,
      outlineStyle: 'solid',
    },
  },
});

export const radioGroupItem = styleVariants({
  default: [defaultStyle],
  withLabel: [
    defaultStyle,
    {
      minHeight: 24,
      display: 'flex',
      alignItems: 'center',
      borderRadius: 1,
      padding: '0 4px',
      selectors: {
        [`&:has(${radioGroupIndicatorWrapper}:focus-visible)`]: {
          outlineOffset: radioItemOutlineOffset,
          outlineColor: vars.colors.$radiobutton_focus_color,
          outlineWidth: radioItemOutlineWidth,
          outlineStyle: 'solid',
        },
      },
    },
  ],
});

export const radioGroupIndicator = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '$circle',
  }),
  {
    width: vars.spacing.$fill,
    height: vars.spacing.$fill,
    position: 'relative',
    backgroundColor: vars.colors.$radiobutton_indicator_backgroundColor,

    selectors: {
      '&:active::after': {
        content: '',
        display: 'flex',
        width: vars.spacing.$8,
        height: vars.spacing.$8,
        borderRadius: '50%',
        backgroundColor: vars.colors.$radiobutton_indicator_check_color,
      },
      '&::after': {
        content: '',
        display: 'flex',
        width: vars.spacing.$10,
        height: vars.spacing.$10,
        borderRadius: '50%',
        backgroundColor: vars.colors.$radiobutton_indicator_check_color,
      },
    },
  },
]);

export const iconWrapper = style([
  sx({
    marginLeft: '$18',
    width: '$40',
    height: '$40',
  }),
  {
    flexGrow: 1,
  },
]);

export const iconButton = style([
  sx({
    borderRadius: '$small',
    color: '$radiobutton_icon_text_color',
    width: '$40',
    height: '$40',
    backgroundColor: '$radiobutton_icon_color',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  {
    fontSize: 24,
    border: `2px solid ${vars.colors.$radiobutton_icon_hover_border_color}`,
    outline: 'none',
    ':focus': {
      backgroundColor: vars.colors.$radiobutton_focus_color,
    },
    selectors: {
      ['&:not(:disabled):hover']: {
        border: `2px solid ${vars.colors.$radiobutton_icon_hover_border_color}`,
        backgroundColor: vars.colors.$radiobutton_icon_hover_color,
      },
      ['&:not(:disabled):active']: {
        border: `2px solid ${vars.colors.$radiobutton_icon_hover_border_color}`,
        backgroundColor: vars.colors.$radiobutton_icon_active,
      },
    },
    ':disabled': {
      cursor: 'not-allowed',
      opacity: '20%',
      border: `2px solid ${vars.colors.$radiobutton_icon_disabled_border_color}`,
    },
  },
]);

export const root = style([
  sx({
    alignItems: 'center',
    justifyContent: 'stretch',
    borderRadius: '$small',
  }),
  {
    display: 'inline-flex',
  },
]);

export const label = sx({
  fontSize: '$18',
  fontWeight: '$medium',
  lineHeight: '$24',
  paddingLeft: '$16',
  display: 'flex',
});

export const disabled = style([
  sx({
    opacity: '$0_24',
  }),
  {
    cursor: 'not-allowed',
  },
]);
