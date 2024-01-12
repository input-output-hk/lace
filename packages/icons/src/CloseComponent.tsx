import * as React from 'react';
import type { SVGProps } from 'react';
const SvgClosecomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 20 20" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m5.2 14.8 9.6-9.6m-9.6 0 9.6 9.6"
    />
  </svg>
);
export { SvgClosecomponent as ReactComponent };
