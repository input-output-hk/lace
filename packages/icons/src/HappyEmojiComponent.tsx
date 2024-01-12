import * as React from 'react';
import type { SVGProps } from 'react';
const SvgHappyEmojicomponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 88 88" {...props}>
    <path
      stroke="url(#happy-emoji_component_svg__a)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M30.8 57.2c7.29 7.29 19.11 7.29 26.4 0m.8-22.533h-.047m-27.953 0h-.047M2 44c0 23.196 18.804 42 42 42s42-18.804 42-42S67.196 2 44 2 2 20.804 2 44"
    />
    <defs>
      <linearGradient
        id="happy-emoji_component_svg__a"
        x1={101.37}
        x2={-21.7}
        y1={-13.37}
        y2={-4.293}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF92E1" />
        <stop offset={1} stopColor="#FDC300" />
      </linearGradient>
    </defs>
  </svg>
);
export { SvgHappyEmojicomponent as ReactComponent };
