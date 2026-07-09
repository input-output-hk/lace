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

// Minimal ambient declaration for @trezor/connect-mobile until the dependency
// is resolved by npm install. Once installed, the package's bundled types take
// precedence and this declaration becomes inert.
// Reference: https://mintlify.wiki/trezor/trezor-suite/connect/react-native-integration
declare module '@trezor/connect-mobile' {
  interface TrezorConnectMobileManifest {
    email: string;
    appName: string;
    appUrl: string;
  }

  interface TrezorConnectMobileInitOptions {
    manifest: TrezorConnectMobileManifest;
    deeplinkOpen: (url: string) => void;
    deeplinkCallbackUrl: string;
    connectSrc?: string;
  }

  type TrezorConnectBip32Path = number[] | string;

  interface TrezorConnectCardanoGetPublicKeyParams {
    path: TrezorConnectBip32Path;
    showOnTrezor?: boolean;
    derivationType?: number;
  }

  interface TrezorConnectCardanoGetPublicKeyPayload {
    publicKey: string;
    path: number[];
  }

  interface TrezorConnectFeaturesPayload {
    [key: string]: unknown;
    device_id?: string;
  }

  interface TrezorConnectUnsuccessfulPayload {
    error: string;
    code?: string;
  }

  interface TrezorConnectDeviceInfo {
    path?: string;
    state?: string;
    features?: {
      [key: string]: unknown;
      device_id?: string;
    };
  }

  type TrezorConnectResult<P> =
    | {
        success: true;
        payload: P;
        device?: TrezorConnectDeviceInfo;
      }
    | { success: false; payload: TrezorConnectUnsuccessfulPayload };

  interface TrezorConnectCardanoSignTransactionParams {
    [key: string]: unknown;
    signingMode: number;
    derivationType?: number;
  }

  interface TrezorConnectCardanoSignedTxWitness {
    type: number;
    pubKey: string;
    signature: string;
    chainCode?: string;
  }

  interface TrezorConnectCardanoSignedTxPayload {
    hash: string;
    witnesses: TrezorConnectCardanoSignedTxWitness[];
    auxiliaryDataSupplement?: {
      type: number;
      auxiliaryDataHash: string;
      cVoteRegistrationSignature?: string;
    };
  }

  interface TrezorConnectMobileStatic {
    init: (options: TrezorConnectMobileInitOptions) => Promise<void>;
    handleDeeplink: (url: string) => void;
    cardanoGetPublicKey: (
      params: TrezorConnectCardanoGetPublicKeyParams,
    ) => Promise<TrezorConnectResult<TrezorConnectCardanoGetPublicKeyPayload>>;
    cardanoSignTransaction: (
      params: TrezorConnectCardanoSignTransactionParams,
    ) => Promise<TrezorConnectResult<TrezorConnectCardanoSignedTxPayload>>;
    getFeatures: () => Promise<
      TrezorConnectResult<TrezorConnectFeaturesPayload>
    >;
    cancel?: (reason?: string) => void;
  }

  const TrezorConnect: TrezorConnectMobileStatic;
  export default TrezorConnect;
}
