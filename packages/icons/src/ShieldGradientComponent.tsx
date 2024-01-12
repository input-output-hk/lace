import * as React from 'react';
import type { SVGProps } from 'react';
const SvgShieldGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#shield-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m9 12 2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.96 11.96 0 0 1-8.618 3.04A12 12 0 0 0 3 9c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016"
    />
    <defs>
      <linearGradient
        id="shield-gradient_component_svg__a"
        x1={-0.294}
        x2={26.073}
        y1={-0.29}
        y2={1.69}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgShieldGradientcomponent as ReactComponent };
