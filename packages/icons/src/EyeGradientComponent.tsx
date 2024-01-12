import * as React from 'react';
import type { SVGProps } from 'react';
const SvgEyeGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
      <path stroke="url(#eye-gradient_component_svg__a)" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
      <path
        stroke="url(#eye-gradient_component_svg__b)"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7"
      />
    </g>
    <defs>
      <linearGradient
        id="eye-gradient_component_svg__a"
        x1={-1.034}
        x2={26.798}
        y1={2.438}
        y2={5.237}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
      <linearGradient
        id="eye-gradient_component_svg__b"
        x1={-1.034}
        x2={26.798}
        y1={2.438}
        y2={5.237}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgEyeGradientcomponent as ReactComponent };
