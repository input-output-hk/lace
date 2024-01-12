import * as React from 'react';
import type { SVGProps } from 'react';
const SvgPlainCirclecomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0"
    />
  </svg>
);
export { SvgPlainCirclecomponent as ReactComponent };
