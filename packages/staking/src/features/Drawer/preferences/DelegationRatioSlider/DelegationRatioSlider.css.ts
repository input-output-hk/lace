import { style, sx } from '../../../../design-tokens';
import { theme } from '../../../theme';

export const SliderContainer = style([
  sx({
    alignItems: 'center',
    display: 'flex',
    gap: '$4',
  }),
  { width: '100%' },
]);

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
    borderRadius: '$full',
    height: '$4',
  }),
  {
    backgroundColor: theme.colors.$sliderRailFill,
    flexGrow: 1,
    position: 'relative',
  },
]);

export const SliderRange = style([
  sx({
    borderRadius: '$full',
  }),
  {
    backgroundColor: theme.colors.$sliderFillPrimary,
    height: '100%',
    position: 'absolute',
  },
]);

export const SliderThumb = style([
  sx({
    borderRadius: '$full',
    height: '$20',
    width: '$20',
  }),
  {
    backgroundColor: theme.colors.$sliderKnobFill,
    border: '2px solid',
    borderColor: theme.colors.$sliderFillPrimary,
    boxShadow: '0 2px 10px var(--black-a7)',
    display: 'block',
  },
]);
