import { recipe } from '@vanilla-extract/recipes';
import { rgba } from 'polished';

import { style, vars, createVar, globalStyle } from '../../design-tokens';

import { Scheme } from './types';

export const button = style({});

export const borderGap = createVar();

export const container = recipe({
  base: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    appearance: 'none',
    border: vars.borders.$button_default,
    borderRadius: vars.radius.$medium,
    outline: 'none',
    vars: {
      [borderGap]: vars.spacing.$2,
    },
    ':disabled': {
      opacity: vars.opacities.$0_24,
    },
    selectors: {
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$control_buttons_container_outlineColor}`,
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
        height: vars.spacing.$48,
        minWidth: vars.spacing.$116,
        paddingLeft: vars.spacing.$24,
        paddingRight: vars.spacing.$24,
      },
      [Scheme.Icon]: {
        height: vars.spacing.$48,
        paddingLeft: vars.spacing.$16,
        paddingRight: vars.spacing.$16,
      },
      [Scheme.Small]: {
        height: vars.spacing.$40,
        paddingLeft: vars.spacing.$24,
        paddingRight: vars.spacing.$24,
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
