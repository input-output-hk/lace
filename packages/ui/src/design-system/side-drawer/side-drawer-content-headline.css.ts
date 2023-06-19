import { sx, style } from '../../design-tokens';

export const container = sx({
  py: '$32',
  px: '$40',
});

export const separator = style([
  sx({
    background: '$side_drawer_separator_bgColor',
    width: '$fill',
    mb: '$32',
  }),
  {
    height: '1.5px',
  },
]);

export const title = sx({
  color: '$side_drawer_head_title_color',
});

export const description = sx({
  color: '$side_drawer_content_description_color',
});
