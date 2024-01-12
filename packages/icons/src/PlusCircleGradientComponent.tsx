import * as React from 'react';
import type { SVGProps } from 'react';
const SvgPlusCircleGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#plus-circle-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0"
    />
    <defs>
      <linearGradient
        id="plus-circle-gradient_component_svg__a"
        x1={-0.294}
        x2={26.078}
        y1={-0.294}
        y2={1.651}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgPlusCircleGradientcomponent as ReactComponent };
