declare module '*.component.svg' {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const content: any;
  // eslint-disable-next-line import/no-default-export
  export default content;
}
