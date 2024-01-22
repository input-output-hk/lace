/* eslint-disable unicorn/no-null */
import { Cardano } from '@cardano-sdk/core';
import * as KeyManagement from '../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
import { ChainName, DeviceConnection, CreateHardwareWalletArgs, HardwareWallets } from '../types';
import { CardanoWalletByChain, KeyAgentsByChain } from '@src/wallet';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import * as Crypto from '@cardano-sdk/crypto';
import * as HardwareLedger from '../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';
// Using nodejs CML version to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build
import * as CML from '@dcspark/cardano-multiplatform-lib-nodejs';

const isTrezorHWSupported = (): boolean => process.env.USE_TREZOR_HW === 'true';

const createEnumObject = <T extends string>(o: Array<T>) => o;
export const AVAILABLE_WALLETS = createEnumObject<HardwareWallets>(
  isTrezorHWSupported()
    ? [KeyManagement.KeyAgentType.Ledger, KeyManagement.KeyAgentType.Trezor]
    : [KeyManagement.KeyAgentType.Ledger]
);
const DEFAULT_COMMUNICATION_TYPE = KeyManagement.CommunicationType.Web;

// https://github.com/trezor/connect/blob/develop/docs/index.md#trezor-connect-manifest
const manifest: KeyManagement.TrezorConfig['manifest'] = {
  appUrl: process.env.WEBSITE_URL,
  email: process.env.EMAIL_ADDRESS
};

const TREZOR_CONFIG: KeyManagement.TrezorConfig = {
  communicationType: DEFAULT_COMMUNICATION_TYPE,
  manifest
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

// TODO: try to refactor the one in `cardano-wallet` to be able to use it here too. [LW-5459]
//       Biggest issue looks like it's the two different ways to create the key agents in this one
export const createHardwareWalletsByChain = async (
  accountIndex: number,
  deviceConnection: DeviceConnection,
  activeChainId: Cardano.ChainId,
  connectedDevice: HardwareWallets
): Promise<Pick<CardanoWalletByChain, 'keyAgent' | 'keyAgentsByChain'>> => {
  const keyAgentsByChain: KeyAgentsByChain = {} as KeyAgentsByChain;
  let activeChainName: ChainName;

  const setup = async ({
    chainId,
    connectedDevice: currentconnectedDevice
  }: {
    chainId: Cardano.ChainId;
    connectedDevice: KeyManagement.KeyAgentType;
  }) => {
    const keyAgent =
      currentconnectedDevice === KeyManagement.KeyAgentType.Ledger
        ? await HardwareLedger.LedgerKeyAgent.createWithDevice(
            {
              communicationType: DEFAULT_COMMUNICATION_TYPE,
              accountIndex,
              deviceConnection: deviceConnection as HardwareLedger.LedgerKeyAgent['deviceConnection'],
              chainId
            },
            { logger: console, bip32Ed25519: new Crypto.CmlBip32Ed25519(CML) }
          )
        : await HardwareTrezor.TrezorKeyAgent.createWithDevice(
            {
              accountIndex,
              trezorConfig: TREZOR_CONFIG,
              chainId
            },
            { logger: console, bip32Ed25519: new Crypto.CmlBip32Ed25519(CML) }
          );
    return { keyAgent };
  };

  // Key agent for wallet to activate
  const { keyAgent: activeKeyAgent } = await setup({ chainId: activeChainId, connectedDevice });

  for (const [chainName, chainId] of Object.entries(Cardano.ChainIds)) {
    if (chainId.networkId === activeChainId.networkId && chainId.networkMagic === activeChainId.networkMagic)
      activeChainName = chainName as ChainName;
  }
  if (!activeChainName) throw new Error('Incorrect chain supplied');
  keyAgentsByChain[activeChainName] = { keyAgentData: activeKeyAgent.serializableData };

  // Rest of key agents to be able to switch
  await Promise.all(
    Object.entries(Cardano.ChainIds)
      .filter(([chainName]) => chainName !== activeChainName)
      .map(async ([chainName, chainId]) => {
        // Create a key agent for each chain id to save in storage
        const { keyAgent } = await setup({ chainId, connectedDevice });

        // Build object with key agents for all chains to be able to switch to eventually
        keyAgentsByChain[chainName as ChainName] = { keyAgentData: keyAgent.serializableData };
      })
  );

  return { keyAgent: activeKeyAgent, keyAgentsByChain };
};

export const createHardwareWallet = async (
  walletManagerUi: WalletManagerUi,
  {
    deviceConnection,
    name,
    accountIndex,
    activeChainId,
    connectedDevice
  }: CreateHardwareWalletArgs & { connectedDevice: HardwareWallets }
): Promise<CardanoWalletByChain> => {
  const { wallet } = walletManagerUi;

  const { keyAgent, keyAgentsByChain } = await createHardwareWalletsByChain(
    accountIndex,
    deviceConnection,
    activeChainId,
    connectedDevice
  );

  const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  await walletManagerUi.activate({ keyAgent: asyncKeyAgent, observableWalletName: name });

  return { asyncKeyAgent, name, wallet, keyAgent, keyAgentsByChain };
};
