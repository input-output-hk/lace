import { style, sx } from '../../../design-tokens';

export const storyContainer = style([
  sx({
    p: '$10',
    background: '$variants_table_bgColor',
    w: '$fill',
    h: '$fill',
    minHeight: '$fill',
  }),
  { flex: 1, overflowY: 'auto' },
]);

export const root = style({
  minHeight: '100%',
  height: '100%',
});
