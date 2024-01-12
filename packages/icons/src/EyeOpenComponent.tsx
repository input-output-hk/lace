import * as React from 'react';
import type { SVGProps } from 'react';
const SvgEyeOpencomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      stroke="#6F7786"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0"
    />
    <path
      stroke="#6F7786"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.733 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.543-7"
    />
  </svg>
);
export { SvgEyeOpencomponent as ReactComponent };
