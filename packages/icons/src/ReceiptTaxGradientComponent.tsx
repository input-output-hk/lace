import * as React from 'react';
import type { SVGProps } from 'react';
const SvgReceiptTaxGradientcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="url(#receipt-tax-gradient_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m9 14 6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2zM10 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m5 5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"
    />
    <defs>
      <linearGradient
        id="receipt-tax-gradient_component_svg__a"
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
export { SvgReceiptTaxGradientcomponent as ReactComponent };
