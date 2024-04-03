import { style, vars, createVar, globalStyle } from '../../design-tokens';

export const scrollbarSize = createVar();

export const root = style({
  width: '100%',
  height: '100%',
  overflow: 'hidden',

  vars: {
    [scrollbarSize]: '6px',
  },
});

export const viewport = style({
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
});

export const scrollbar = style({
  display: 'flex',
  //ensures no selection
  userSelect: 'none',
  //disable browser handling of all panning and zooming gestures on touch devices
  touchAction: 'none',
  padding: '2px',

  selectors: {
    '&[data-orientation="vertical"]': {
      width: scrollbarSize,
    },
    '&[data-orientation="horizontal"]': {
      flexDirection: 'column',
      height: scrollbarSize,
    },
  },
});

export const thumb = style({
  flex: '1',
  position: 'relative',
  background: vars.colors.$scrollbar_thumb_container_bgColor,
  borderRadius: scrollbarSize,

  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',

    width: '100%',
    height: '100%',
    minWidth: vars.spacing.$40,
    minHeight: vars.spacing.$40,
  },

  ':hover': {
    background: vars.colors.$scrollbar_thumb_container_bgColor_hover,
  },
});

export const scrollAreaCorner = style({});

// storybook only
globalStyle(`#hover-state ${thumb}`, {
  background: vars.colors.$scrollbar_thumb_container_bgColor_hover,
});
