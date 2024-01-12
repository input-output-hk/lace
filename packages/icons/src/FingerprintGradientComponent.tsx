import * as React from 'react';
import type { SVGProps } from 'react';
const SvgFingerprintGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#fingerprint-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.9 13.9 0 0 0 8 11a4 4 0 1 1 8 0q-.002 1.527-.203 3m-2.118 6.844A22 22 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
    />
    <defs>
      <linearGradient
        id="fingerprint-gradient_component_svg__a"
        x1={-0.111}
        x2={24.809}
        y1={-0.265}
        y2={1.486}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgFingerprintGradientcomponent as ReactComponent };
