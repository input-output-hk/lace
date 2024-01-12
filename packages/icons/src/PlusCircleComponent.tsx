import * as React from 'react';
import type { SVGProps } from 'react';
const SvgPlusCirclecomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 20 20" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 7v3m0 0v3m0-3h3m-3 0H7m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0"
    />
  </svg>
);
export { SvgPlusCirclecomponent as ReactComponent };
