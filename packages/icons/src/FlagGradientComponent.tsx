import * as React from 'react';
import type { SVGProps } from 'react';
const SvgFlagGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#flag-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 21v-3.778m0 0V5.89C4 4.846 4.846 4 5.889 4h6.139l.944.944H21l-2.833 5.667L21 16.278h-8.028l-.944-.945h-6.14A1.89 1.89 0 0 0 4 17.223m8.5-12.75v5.195"
    />
    <defs>
      <linearGradient
        id="flag-gradient_component_svg__a"
        x1={0.889}
        x2={25.796}
        y1={0.889}
        y2={2.726}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgFlagGradientcomponent as ReactComponent };
