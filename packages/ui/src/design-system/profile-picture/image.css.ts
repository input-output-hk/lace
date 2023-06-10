import { style } from '@vanilla-extract/css';

import { sx, vars, createVar, globalStyle } from '../../design-tokens';

export const borderGap = createVar();

export const root = style({});

export const container = style([
  sx({
    height: {
      popupScreen: '$40',
      smallScreen: '$48',
    },
    width: {
      popupScreen: '$40',
      smallScreen: '$48',
    },
    borderRadius: '$circle',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  {
    overflow: 'hidden',
    userSelect: 'none',
    border: `${borderGap} solid ${vars.colors.$profile_picture_image_container_borderColor}`,
    vars: {
      [borderGap]: '1.5px',
    },
  },
]);

export const selected = style([
  {
    boxShadow: `0 0 0px calc(${borderGap} + 1px) ${vars.colors.$profile_picture_image_container_borderColor_selected}`,
  },
]);

export const image = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 'inherit',
});

// storybook only
globalStyle(`[data-view-mode="popup"] ${root}`, {
  width: vars.spacing.$40,
  height: vars.spacing.$40,
});
