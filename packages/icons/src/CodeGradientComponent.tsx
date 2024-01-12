import * as React from 'react';
import type { SVGProps } from 'react';
const SvgCodeGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#code-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m10 20 4-16m4 4 4 4-4 4M6 16l-4-4 4-4"
    />
    <defs>
      <linearGradient
        id="code-gradient_component_svg__a"
        x1={-1.66}
        x2={27.554}
        y1={1.072}
        y2={3.766}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgCodeGradientcomponent as ReactComponent };
