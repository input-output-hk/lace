declare module '*.scss' {
  interface IClassNames {
    [className: string]: string;
  }
  const classNames: IClassNames;
  export = classNames;
}

declare module '*.module.scss' {
  interface IClassNames {
    [className: string]: string;
  }
  const classNames: IClassNames;
  export = classNames;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  export const ReactComponent: import('react').FC<
    import('react').SVGProps<SVGSVGElement>
  >;
  export default ReactComponent;
}

declare module 'react-native-qrcode-styled' {
  import type { QRCodeOptions } from 'qrcode';

  const QRCodeStyled: import('react').ComponentType<any>;
  export function useQRCodeData(
    data: string,
    options: QRCodeOptions,
  ): { bitMatrix: unknown; qrCodeSize: number };
  export default QRCodeStyled;
}
