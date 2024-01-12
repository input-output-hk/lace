import * as React from 'react';
import type { SVGProps } from 'react';
const SvgPlusSmallcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="1em" height="1em" {...props}>
    <path
      stroke="#6F7786"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7.5 1v6m0 0v6m0-6h6m-6 0h-6"
    />
  </svg>
);
export { SvgPlusSmallcomponent as ReactComponent };
