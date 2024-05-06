import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const SliderContainer = sx({
  alignItems: 'center',
  display: 'flex',
  gap: '$4',
  width: '$fill',
});

export const SliderRoot = style([
  sx({
    height: '$20',
  }),
  {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
  },
]);

export const SliderTrack = style([
  sx({
    backgroundColor: '$sliderRailFill',
    borderRadius: '$full',
    height: '$4',
  }),
  {
    flexGrow: 1,
    position: 'relative',
  },
]);

export const SliderRange = style([
  sx({
    backgroundColor: '$sliderFillPrimary',
    borderRadius: '$full',
    height: '$fill',
  }),
  {
    position: 'absolute',
  },
]);

export const SliderThumb = style([
  sx({
    backgroundColor: '$sliderKnobFill',
    borderColor: '$sliderFillPrimary',
    borderRadius: '$full',
    height: '$20',
    width: '$20',
  }),
  {
    borderStyle: 'solid',
    borderWidth: 2,
    boxShadow: '0 2px 10px var(--black-a7)',
    display: 'block',
  },
]);
