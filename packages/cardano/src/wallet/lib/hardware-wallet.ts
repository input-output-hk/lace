/* eslint-disable unicorn/no-null */
import * as KeyManagement from '@cardano-sdk/key-management';
import { DeviceConnection, HardwareWallets } from '../types';
import * as HardwareLedger from '../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';
// Using nodejs CML version to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build

const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

const createEnumObject = <T extends string>(o: Array<T>) => o;
export const AVAILABLE_WALLETS = createEnumObject<HardwareWallets>(
  isTrezorHWSupported()
    ? [KeyManagement.KeyAgentType.Ledger, KeyManagement.KeyAgentType.Trezor]
    : [KeyManagement.KeyAgentType.Ledger]
);
const DEFAULT_COMMUNICATION_TYPE = KeyManagement.CommunicationType.Web;

// https://github.com/trezor/connect/blob/develop/docs/index.md#trezor-connect-manifest
export const manifest: KeyManagement.TrezorConfig['manifest'] = {
  appUrl: process.env.WEBSITE_URL,
  email: process.env.EMAIL_ADDRESS
};

const connectDevices: Record<HardwareWallets, () => Promise<DeviceConnection>> = {
  [KeyManagement.KeyAgentType.Ledger]: async () =>
    await HardwareLedger.LedgerKeyAgent.checkDeviceConnection(DEFAULT_COMMUNICATION_TYPE),
  ...(AVAILABLE_WALLETS.includes(KeyManagement.KeyAgentType.Trezor) && {
    [KeyManagement.KeyAgentType.Trezor]: async () => {
      const isTrezorInitialized = await HardwareTrezor.TrezorKeyAgent.initializeTrezorTransport({
        manifest,
        communicationType: DEFAULT_COMMUNICATION_TYPE
      });

      // initializeTrezorTransport would still succeed even when device is not connected
      await HardwareTrezor.TrezorKeyAgent.checkDeviceConnection(KeyManagement.CommunicationType.Web);

      return isTrezorInitialized;
    }
  })
};

export const connectDevice = async (model: HardwareWallets): Promise<DeviceConnection> => await connectDevices[model]();

// export const createHardwareWallet = async (
//   walletManager: WalletManagerApi,
//   {
//     deviceConnection,
//     name,
//     accountIndex,
//     activeChainId,
//     connectedDevice
//   }: CreateHardwareWalletArgs & { connectedDevice: HardwareWallets }
// ): Promise<CardanoWallet> => {
//   const { wallet } = walletManager;

//   const { keyAgent, keyAgentsByChain } = await createHardwareWalletsByChain(
//     accountIndex,
//     deviceConnection,
//     activeChainId,
//     connectedDevice
//   );

//   const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
//   await walletManager.activate({ keyAgent: asyncKeyAgent, observableWalletName: name });

//   return { asyncKeyAgent, name, wallet, keyAgent, keyAgentsByChain };
// };
