import * as React from 'react';
import type { SVGProps } from 'react';
const SvgChevronRightcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 8 12" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M2 1.333 6.667 6 2 10.667"
    />
  </svg>
);
export { SvgChevronRightcomponent as ReactComponent };
