import * as React from 'react';
import type { SVGProps } from 'react';
const SvgFireGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <path
        stroke="url(#fire-gradient_component_svg__a)"
        d="M17.657 18.657A8 8 0 0 1 6.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.98 7.98 0 0 1 20 13a7.98 7.98 0 0 1-2.343 5.657"
      />
      <path
        stroke="url(#fire-gradient_component_svg__b)"
        d="M9.879 16.121A3 3 0 1 0 12.015 11L11 14H9c0 .768.293 1.536.879 2.121"
      />
    </g>
    <defs>
      <linearGradient
        id="fire-gradient_component_svg__a"
        x1={1.072}
        x2={24.541}
        y1={-0.294}
        y2={1.245}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
      <linearGradient
        id="fire-gradient_component_svg__b"
        x1={1.072}
        x2={24.541}
        y1={-0.294}
        y2={1.245}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgFireGradientcomponent as ReactComponent };
