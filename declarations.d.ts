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

  interface TrezorConnectGetPublicKeyBundleItem {
    path: TrezorConnectBip32Path;
    coin?: string;
    showOnTrezor?: boolean;
  }

  interface TrezorConnectGetPublicKeyBundleParams {
    bundle: TrezorConnectGetPublicKeyBundleItem[];
  }

  interface TrezorConnectHdNodePayload {
    path: number[];
    serializedPath: string;
    childNum: number;
    xpub: string;
    xpubSegwit?: string;
    chainCode: string;
    publicKey: string;
    fingerprint: number;
    depth: number;
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

  interface TrezorConnectBitcoinTxInput {
    prev_hash: string;
    prev_index: number;
    amount: string | number;
    address_n: number[];
    script_type?: string;
    sequence?: number;
  }

  interface TrezorConnectBitcoinTxOutput {
    address?: string;
    address_n?: number[];
    amount: string | number;
    script_type?: string;
    op_return_data?: string;
  }

  interface TrezorConnectBitcoinRefTxInput {
    prev_hash: string;
    prev_index: number;
    script_sig: string;
    sequence: number;
  }

  interface TrezorConnectBitcoinRefTxBinOutput {
    amount: string | number;
    script_pubkey: string;
  }

  interface TrezorConnectBitcoinRefTransaction {
    hash: string;
    version: number;
    lock_time: number;
    inputs: TrezorConnectBitcoinRefTxInput[];
    bin_outputs: TrezorConnectBitcoinRefTxBinOutput[];
  }

  interface TrezorConnectSignTransactionParams {
    coin: string;
    inputs: TrezorConnectBitcoinTxInput[];
    outputs: TrezorConnectBitcoinTxOutput[];
    refTxs?: TrezorConnectBitcoinRefTransaction[];
    version?: number;
    locktime?: number;
    push?: boolean;
  }

  interface TrezorConnectSignedBitcoinTxPayload {
    signatures: string[];
    serializedTx: string;
    txid?: string;
  }

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
    getPublicKey: (
      params: TrezorConnectGetPublicKeyBundleParams,
    ) => Promise<TrezorConnectResult<TrezorConnectHdNodePayload[]>>;
    signTransaction: (
      params: TrezorConnectSignTransactionParams,
    ) => Promise<TrezorConnectResult<TrezorConnectSignedBitcoinTxPayload>>;
    getFeatures: () => Promise<
      TrezorConnectResult<TrezorConnectFeaturesPayload>
    >;
    cancel?: (reason?: string) => void;
  }

  const TrezorConnect: TrezorConnectMobileStatic;
  export default TrezorConnect;
}
