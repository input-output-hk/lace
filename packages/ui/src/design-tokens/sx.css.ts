import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

import { vars } from './theme';

const responsiveProperties = defineProperties({
  conditions: {
    popupScreen: { '@media': 'screen and (min-width: 360px)' },
    smallScreen: { '@media': 'screen and (min-width: 1280px)' },
    mediumScreen: { '@media': 'screen and (min-width: 1440px)' },
    largeScreen: { '@media': 'screen and (min-width: 1660px)' },
    xLargeScreen: { '@media': 'screen and (min-width: 1920px)' },
  },
  defaultCondition: 'popupScreen',
  responsiveArray: [
    'popupScreen',
    'smallScreen',
    'mediumScreen',
    'largeScreen',
    'xLargeScreen',
  ],
  properties: {
    display: ['none', 'flex', 'block', 'inline', 'inline-block', 'grid'],
    flexDirection: ['row', 'column', 'column-reverse'],
    justifyContent: [
      'stretch',
      'flex-start',
      'center',
      'flex-end',
      'space-around',
      'space-between',
    ],
    boxSizing: ['border-box', 'content-box'],
    alignItems: ['stretch', 'flex-start', 'center', 'flex-end'],
    padding: vars.spacing,
    paddingTop: vars.spacing,
    paddingBottom: vars.spacing,
    paddingLeft: vars.spacing,
    paddingRight: vars.spacing,
    margin: vars.spacing,
    marginTop: vars.spacing,
    marginBottom: vars.spacing,
    marginLeft: vars.spacing,
    marginRight: vars.spacing,
    width: vars.spacing,
    height: vars.spacing,
    gap: vars.spacing,
    minWidth: vars.spacing,
    minHeight: vars.spacing,
    maxWidth: vars.spacing,
    maxHeight: vars.spacing,
    rowGap: vars.spacing,
    columnGap: vars.spacing,
    right: vars.spacing,
    left: vars.spacing,
    top: vars.spacing,
    bottom: vars.spacing,
  },
  shorthands: {
    m: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'],
    ml: ['marginLeft'],
    mr: ['marginRight'],
    mb: ['marginBottom'],
    mt: ['marginTop'],
    mx: ['marginLeft', 'marginRight'],
    my: ['marginTop', 'marginBottom'],
    p: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    pl: ['paddingLeft'],
    placeItems: ['justifyContent', 'alignItems'],
    pr: ['paddingRight'],
    px: ['paddingLeft', 'paddingRight'],
    py: ['paddingTop', 'paddingBottom'],
    pt: ['paddingTop'],
    pb: ['paddingBottom'],
    h: ['height'],
    w: ['width'],
  },
});

const typographyProperties = defineProperties({
  properties: {
    fontSize: vars.fontSizes,
    fontWeight: vars.fontWeights,
    lineHeight: vars.lineHeights,
    fontFamily: vars.fontFamily,
  },
});

const colorProperties = defineProperties({
  properties: {
    color: vars.colors,
    background: vars.colors,
    borderColor: vars.colors,
    borderImageSource: vars.colors,
    backgroundImage: vars.colors,
    backgroundColor: vars.colors,
  },
});

const radiusProperties = defineProperties({
  properties: {
    borderRadius: vars.radius,
  },
});

const elevationProperties = defineProperties({
  properties: {
    boxShadow: vars.elevation,
  },
});

const opacityProperties = defineProperties({
  properties: {
    opacity: vars.opacities,
  },
});

export const sx = createSprinkles(
  responsiveProperties,
  typographyProperties,
  colorProperties,
  radiusProperties,
  elevationProperties,
  opacityProperties,
);

export type Sx = Parameters<typeof sx>[0];
