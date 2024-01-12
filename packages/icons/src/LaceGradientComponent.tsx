import * as React from 'react';
import type { SVGProps } from 'react';
const SvgLaceGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" {...props}>
    <defs>
      <linearGradient id="lace-gradient_component_svg__a" x1="0%" x2="100%" y1="0%" y2="0%">
        <stop offset="-18.3%" stopColor="#FF92E1" />
        <stop offset="118.89%" stopColor="#FDC300" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#lace-gradient_component_svg__a)" />
  </svg>
);
export { SvgLaceGradientcomponent as ReactComponent };
