import * as React from 'react';
import type { SVGProps } from 'react';
const SvgQuestionMarkcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 20 20" {...props}>
    <path
      fill="url(#question-mark_component_svg__a)"
      d="m10.994 10.907-.188-.982zm-5.67-4.333a1 1 0 0 0 1.808.852zM9 12a1 1 0 0 0 2 0zm1 2a1 1 0 1 0 0 2zm.01 2a1 1 0 1 0 0-2zM18 10a8 8 0 0 1-8 8v2c5.523 0 10-4.477 10-10zm-8 8a8 8 0 0 1-8-8H0c0 5.523 4.477 10 10 10zm-8-8a8 8 0 0 1 8-8V0C4.477 0 0 4.477 0 10zm8-8a8 8 0 0 1 8 8h2c0-5.523-4.477-10-10-10zm3 6c0 .73-.721 1.642-2.194 1.925l.377 1.964C13.166 11.509 15 10.069 15 8zm-3-2c.91 0 1.694.278 2.229.679.534.4.771.878.771 1.321h2c0-1.214-.658-2.236-1.572-2.921C12.516 4.394 11.3 4 10 4zM7.132 7.426C7.472 6.706 8.528 6 10 6V4c-2.011 0-3.918.963-4.677 2.574zm3.674 2.499C9.91 10.096 9 10.858 9 12h2q0 .003 0 0a.1.1 0 0 1 .02-.028.3.3 0 0 1 .163-.083zM10 16h.01v-2H10z"
    />
    <defs>
      <linearGradient
        id="question-mark_component_svg__a"
        x1={-2.294}
        x2={24.078}
        y1={-2.294}
        y2={-0.349}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgQuestionMarkcomponent as ReactComponent };
