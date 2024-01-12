import * as React from 'react';
import type { SVGProps } from 'react';
const SvgDocumentTextGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#document-text-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2"
    />
    <defs>
      <linearGradient
        id="document-text-gradient_component_svg__a"
        x1={2.438}
        x2={22.994}
        y1={-0.294}
        y2={0.886}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgDocumentTextGradientcomponent as ReactComponent };
