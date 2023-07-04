import { style, globalStyle } from '../../design-tokens';

export const stroke = style({});

export const fill = style({});

globalStyle(`${stroke} path`, {
  stroke: 'url(#lace-gradient_component_svg__laceGradient)',
});

globalStyle(`${fill} path`, {
  stroke: 'url(#lace-gradient_component_svg__laceGradient)',
});
