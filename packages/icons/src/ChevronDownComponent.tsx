import * as React from 'react';
import type { SVGProps } from 'react';
const SvgChevronDowncomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m12.667 6-4.666 4.667L3.334 6"
    />
  </svg>
);
export { SvgChevronDowncomponent as ReactComponent };
