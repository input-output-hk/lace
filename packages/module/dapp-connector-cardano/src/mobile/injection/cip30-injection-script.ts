import {
  CIP30_API_VERSION,
  WALLET_NAME,
  WALLET_ICON,
} from '../../common/const';

import { CIP30_WEBVIEW_RUNTIME_SOURCE } from './cip30-injection.webview.generated';

/**
 * Message types for communication between the injected script and the wallet.
 * These correspond to the CIP-30 API methods that dApps can invoke.
 */
export type WalletRequestType =
  | 'enable'
  | 'getBalance'
  | 'getChangeAddress'
  | 'getCollateral'
  | 'getExtensions'
  | 'getNetworkId'
  | 'getNetworkMagic'
  | 'getPubDRepKey'
  | 'getRegisteredPubStakeKeys'
  | 'getRewardAddresses'
  | 'getUnregisteredPubStakeKeys'
  | 'getUnusedAddresses'
  | 'getUsedAddresses'
  | 'getUtxos'
  | 'isEnabled'
  | 'signData'
  | 'signTx'
  | 'submitTx';

/**
 * Structure of a request message sent from the injected script to the wallet.
 *
 * @property id - Unique identifier for the request, used to match responses
 * @property type - The CIP-30 API method being invoked
 * @property args - Optional arguments for the method
 * @property source - Constant identifier to distinguish Lace CIP-30 messages
 */
export interface WalletRequest {
  id: string;
  type: WalletRequestType;
  args?: unknown[];
  source: 'lace-cip30';
}

/**
 * Structure of a response message sent from the wallet back to the injected script.
 *
 * @property id - Request identifier this response corresponds to
 * @property success - Whether the request completed successfully
 * @property result - The result data if successful
 * @property error - Error details if unsuccessful, following CIP-30 error format
 */
export interface WalletResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: { code: number; info: string };
}

/**
 * Configuration options for the CIP-30 injection script.
 *
 * @property walletName - Wallet name exposed to dApps (e.g., 'lace')
 * @property apiVersion - CIP-30 API version string (e.g., '0.1.0')
 * @property walletIcon - Wallet icon as base64 data URI or URL
 * @property supportedExtensions - Array of supported CIP extensions (e.g., [{ cip: 95 }])
 * @property requestTimeout - Timeout for API requests in milliseconds
 * @property debug - Enable debug logging in the injected script's console
 */
export interface InjectionScriptConfig {
  walletName: string;
  apiVersion: string;
  walletIcon: string;
  supportedExtensions: { cip: number }[];
  requestTimeout: number;
  debug: boolean;
}

/**
 * Default configuration using wallet constants.
 * This configuration is suitable for production use.
 */
export const defaultConfig: InjectionScriptConfig = {
  walletName: WALLET_NAME,
  apiVersion: CIP30_API_VERSION,
  walletIcon: WALLET_ICON,
  supportedExtensions: [{ cip: 95 }],
  requestTimeout: 60000,
  debug: __DEV__ ?? false,
};

/**
 * Generates the JavaScript code to inject into the target page/WebView.
 *
 * This creates the window.cardano.lace object with CIP-30 API.
 * The script is a thin proxy that forwards all requests to the wallet
 * via postMessage. The actual wallet logic is handled on the wallet side.
 *
 * @param config - Configuration options for the wallet API
 * @returns JavaScript code string to inject
 */
export const generateCip30InjectionScript = (
  config: InjectionScriptConfig = defaultConfig,
): string => {
  const configJson = JSON.stringify(config);

  return `window.__LACE_CIP30_CONFIG__ = ${configJson};\n${CIP30_WEBVIEW_RUNTIME_SOURCE}`;
};

/**
 * Pre-generated injection script using default configuration.
 * Use this for the injectedJavaScriptBeforeContentLoaded prop in WebView
 * or for extension content script injection.
 */
export const CIP30_INJECTION_SCRIPT =
  generateCip30InjectionScript(defaultConfig);

/**
 * Alias for generateCip30InjectionScript.
 * Use this to generate a custom injection script with different configuration.
 */
export const createInjectionScript = generateCip30InjectionScript;
