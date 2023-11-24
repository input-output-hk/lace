import { sx, style } from '../../design-tokens';

export const subtitleBox = style({
  position: 'relative',
});

export const subtitleContentOffset = style({
  top: '-4px',
});

export const subtitleButtonOffset = style({
  top: '-2px',
});

export const title = sx({
  color: '$text_secondary',
});

export const subtitle = sx({
  color: '$text_primary',
});
