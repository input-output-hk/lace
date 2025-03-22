import React, { SVGProps } from 'react';

// TODO: Mode to lace UI toolkit
const SvgBtcComponentTransparent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={25} height={25} fill="none" {...props}>
    <path
      d="M10 6V4M14 6V4M14 6H7M14 6C15.6569 6 17 7.34315 17 9C17 10.6569 15.6569 12 14 12M9 18L9 12M9 6V12M10 20V18M14 20V18M9 12H15C16.6569 12 18 13.3431 18 15C18 16.6569 16.6569 18 15 18H7"
      stroke="#FFFFFF"
    />
  </svg>
);

export default SvgBtcComponentTransparent;
