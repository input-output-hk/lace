import * as React from 'react';
import type { SVGProps } from 'react';
const SvgArrowLeftcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 20 16" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 15 1 8m0 0 7-7M1 8h18"
    />
  </svg>
);
export { SvgArrowLeftcomponent as ReactComponent };
