import * as React from 'react';
import type { SVGProps } from 'react';
const SvgUploadcomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 40 40" {...props}>
    <path
      stroke="url(#upload_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6.667 26.667v1.667a5 5 0 0 0 5 5h16.666a5 5 0 0 0 5-5v-1.667m-6.666-13.333L20 6.667m0 0-6.667 6.667M20 6.667v20"
    />
    <defs>
      <linearGradient
        id="upload_component_svg__a"
        x1={1.787}
        x2={4.669}
        y1={38.213}
        y2={-0.856}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgUploadcomponent as ReactComponent };
