import * as React from 'react';
import type { SVGProps } from 'react';
const SvgSearchcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 20 20" {...props}>
    <path
      stroke="url(#search_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m19 19-6-6m2-5A7 7 0 1 1 1 8a7 7 0 0 1 14 0"
    />
    <defs>
      <linearGradient
        id="search_component_svg__a"
        x1={-2.294}
        x2={24.078}
        y1={-2.294}
        y2={-0.349}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgSearchcomponent as ReactComponent };
