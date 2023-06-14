import { recipe } from '@vanilla-extract/recipes';

import { style, vars, createVar, globalStyle } from '../../design-tokens';

import { Scheme } from './types';

export const button = style({});

export const borderGap = createVar();

export const container = recipe({
  base: {
    appearance: 'none',
    height: vars.spacing.$48,
    border: '2px solid',
    borderRadius: vars.radius.$medium,
    paddingLeft: vars.spacing.$24,
    paddingRight: vars.spacing.$24,
    minWidth: vars.spacing.$116,
    outline: 'none',
    vars: {
      [borderGap]: vars.spacing.$2,
    },
    ':disabled': {
      opacity: vars.opacities.$0_24,
    },
    // ':hover': {
    //   background: vars.colors.$control_buttons_container_bgColor_hover,
    //   color: vars.colors.$control_buttons_label_color_hover,
    // },
    selectors: {
      // '&:active': {
      //   background: vars.colors.$control_buttons_container_bgColor_pressed,
      //   color: vars.colors.$control_buttons_label_color,
      // },
      // '&:focus:not(:active)': {
      //   outlineColor: `${vars.colors.$control_buttons_container_outlineColor}`,
      //   outlineWidth: vars.spacing.$4,
      //   outlineStyle: 'solid',
      // },
    },
  },
  variants: {
    colorScheme: {
      [Scheme.Outlined]: {
        background: vars.colors.$control_buttons_container_bgColor,
      },
      [Scheme.Filled]: {
        background: vars.colors.$control_buttons_container_bgColor,
      },
      [Scheme.Danger]: {
        background: vars.colors.$control_buttons_container_bgColor_danger,
        ':hover': {
          background:
            vars.colors.$control_buttons_container_bgColor_danger_hover,
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
  },
  defaultVariants: {
    colorScheme: Scheme.Outlined,
    borderScheme: Scheme.Outlined,
  },
});

globalStyle(`${button} svg`, {
  width: vars.spacing.$24,
  height: vars.spacing.$24,
});

// export const label = style([
//   sx({ color: '$control_buttons_label_color' }),
//   {
//     selectors: {
//       [`${button}:hover &`]: {
//         color: vars.colors.$control_buttons_label_color_hover,
//       },
//       [`${button}:active &`]: {
//         color: vars.colors.$control_buttons_label_color,
//       },
//     },
//   },
// ]);

export const label = recipe({
  variants: {
    colorScheme: {
      [Scheme.Outlined]: {
        color: vars.colors.$control_buttons_label_color,
      },
      [Scheme.Filled]: {
        color: vars.colors.$control_buttons_label_color,
      },
      [Scheme.Danger]: {
        color: vars.colors.$control_buttons_label_color_danger,
      },
    },
  },
  defaultVariants: {
    colorScheme: Scheme.Outlined,
  },
});
