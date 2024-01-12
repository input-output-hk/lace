import * as React from 'react';
import type { SVGProps } from 'react';
const SvgChevronUpcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 16 16" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m3.333 10 4.666-4.667L12.666 10"
    />
  </svg>
);
export { SvgChevronUpcomponent as ReactComponent };
