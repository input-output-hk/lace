import { recipe } from '@vanilla-extract/recipes';

import { style, vars, globalStyle, sx } from '../../design-tokens';

import { Scheme } from './control-button.data';

export const button = style({});

export const container = recipe({
  base: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    appearance: 'none',
    border: vars.borders.$button_default,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    vars: {
      borderGap: vars.spacing.$2,
    },
    ':disabled': {
      opacity: vars.opacities.$0_24,
    },
    selectors: {
      '&:focus:not(:active)': {
        outlineColor: vars.colors.$control_buttons_container_outlineColor,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
  variants: {
    colorScheme: {
      [Scheme.Outlined]: {
        background: vars.colors.$control_buttons_container_bgColor,
        selectors: {
          '&:hover': {
            background: vars.colors.$control_buttons_container_bgColor_hover,
          },
          '&:active': {
            background: vars.colors.$control_buttons_container_bgColor_pressed,
          },
        },
      },
      [Scheme.Filled]: {
        background: vars.colors.$control_buttons_container_bgColor_filled,
        selectors: {
          '&:hover': {
            background:
              vars.colors.$control_buttons_container_bgColor_filled_hover,
          },
          '&:active': {
            background:
              vars.colors.$control_buttons_container_bgColor_filled_hover,
          },
        },
      },
      [Scheme.Danger]: {
        background: vars.colors.$control_buttons_container_bgColor_danger,
        selectors: {
          '&:hover': {
            background:
              vars.colors.$control_buttons_container_bgColor_danger_hover,
          },
          '&:active': {
            background:
              vars.colors.$control_buttons_container_bgColor_danger_hover,
          },
        },
      },
    },
    borderScheme: {
      [Scheme.Outlined]: {
        borderColor: vars.colors.$control_buttons_borderColor,
      },
      [Scheme.Filled]: {
        borderColor: 'transparent',
      },
      [Scheme.Danger]: {
        borderColor: 'transparent',
      },
    },
    paddingScheme: {
      [Scheme.Outlined]: {
        minWidth: vars.spacing.$116,
        paddingLeft: vars.spacing.$24,
        paddingRight: vars.spacing.$24,
      },
      [Scheme.Icon]: {},
      [Scheme.Small]: {
        minWidth: vars.spacing.$116,
        paddingLeft: vars.spacing.$24,
        paddingRight: vars.spacing.$24,
      },
    },
    widthSchema: {
      fill: {
        width: vars.spacing.$fill,
      },
      auto: {
        width: 'auto',
      },
      small: {
        width: vars.spacing.$40,
      },
      extraSmall: {
        width: vars.spacing.$24,
      },
    },
  },
  defaultVariants: {
    colorScheme: Scheme.Outlined,
    borderScheme: Scheme.Outlined,
    paddingScheme: Scheme.Outlined,
  },
});

globalStyle(`${button} svg`, {
  width: vars.spacing.$24,
  height: vars.spacing.$24,
});

export const label = recipe({
  variants: {
    colorScheme: {
      [Scheme.Outlined]: {
        color: vars.colors.$control_buttons_label_color,
      },
      [Scheme.Filled]: {
        color: vars.colors.$control_buttons_label_color_filled,
        selectors: {
          '&:hover': {
            color: vars.colors.$control_buttons_label_color_filled_hover,
          },
        },
      },
      [Scheme.Danger]: {
        color: vars.colors.$control_buttons_label_color_danger,
        selectors: {
          '&:active': {
            color: vars.colors.$control_buttons_label_color_danger_pressed,
          },
        },
      },
    },
  },
  defaultVariants: {
    colorScheme: Scheme.Outlined,
  },
});

export const icon = recipe({
  base: sx({
    maxWidth: '$24',
    maxHeight: '$24',
  }),
  variants: {
    colorScheme: {
      [Scheme.Outlined]: {
        color: vars.colors.$control_buttons_label_color,
      },
      [Scheme.Filled]: {
        color: vars.colors.$control_buttons_label_color_filled,
        selectors: {
          '&:hover': {
            color: vars.colors.$control_buttons_label_color_filled_hover,
          },
        },
      },
      [Scheme.Danger]: {
        color: vars.colors.$control_buttons_label_color_danger,
        selectors: {
          '&:active': {
            color: vars.colors.$control_buttons_label_color_danger_pressed,
          },
        },
      },
    },
    fontSize: {
      small: sx({
        fontSize: '$18',
      }),
      extraSmall: {
        fontSize: '15px',
      },
    },
  },
  defaultVariants: {
    colorScheme: Scheme.Outlined,
    fontSize: 'small',
  },
});
