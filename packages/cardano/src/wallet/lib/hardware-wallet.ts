/* eslint-disable unicorn/no-null */
import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet, setupWallet, SetupWalletProps } from '@cardano-sdk/wallet';
import * as KeyManagement from '../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
import { ChainName, DeviceConnection, CreateHardwareWalletArgs, HardwareWallets } from '../types';
import { CardanoWalletByChain, KeyAgentsByChain } from './cardano-wallet';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import * as Crypto from '@cardano-sdk/crypto';
import * as HardwareLedger from '../../../../../node_modules/@cardano-sdk/hardware-ledger/dist/cjs';
import * as HardwareTrezor from '../../../../../node_modules/@cardano-sdk/hardware-trezor/dist/cjs';
// Using nodejs to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build
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

const createWithLedgerDeviceConnection = async (
  {
    chainId,
    accountIndex = 0,
    communicationType,
    extendedAccountPublicKey
  }: Omit<
    Parameters<typeof HardwareLedger.LedgerKeyAgent['createWithDevice']>[0] & {
      extendedAccountPublicKey?: Crypto.Bip32PublicKeyHex;
    },
    'deviceConnection'
  >,
  deviceConnection: DeviceConnection,
  dependencies: Parameters<typeof HardwareLedger.LedgerKeyAgent['createWithDevice']>[1]
) => {
  // Throws an authentication error if called after the first key agent creation
  const publicKey =
    extendedAccountPublicKey ??
    (await HardwareLedger.LedgerKeyAgent.getXpub({
      accountIndex,
      communicationType,
      deviceConnection: deviceConnection as HardwareLedger.LedgerKeyAgent['deviceConnection']
    }));

  return new HardwareLedger.LedgerKeyAgent(
    {
      accountIndex,
      chainId,
      communicationType,
      deviceConnection: deviceConnection as HardwareLedger.LedgerKeyAgent['deviceConnection'],
      extendedAccountPublicKey: publicKey,
      knownAddresses: []
    },
    dependencies
  );
};
const createWithTrezorDeviceConnection = async (
  {
    chainId,
    accountIndex = 0,
    extendedAccountPublicKey,
    trezorConfig
  }: Omit<
    Parameters<typeof HardwareTrezor.TrezorKeyAgent['createWithDevice']>[0] & {
      extendedAccountPublicKey?: Crypto.Bip32PublicKeyHex;
    },
    'deviceConnection'
  >,
  dependencies: Parameters<typeof HardwareTrezor.TrezorKeyAgent['createWithDevice']>[1]
) => {
  // Throws an authentication error if called after the first key agent creation
  const publicKey =
    extendedAccountPublicKey ??
    (await HardwareTrezor.TrezorKeyAgent.getXpub({
      accountIndex,
      communicationType: KeyManagement.CommunicationType.Web
    }));

  return new HardwareTrezor.TrezorKeyAgent(
    {
      accountIndex,
      chainId,
      extendedAccountPublicKey: publicKey,
      knownAddresses: [],
      trezorConfig
    },
    dependencies
  );
};

// TODO: try to refactor the one in `cardano-wallet` to be able to use it here too. [LW-5459]
//       Biggest issue looks like it's the two different ways to create the key agents in this one
export const createHardwareWalletsByChain = async (
  accountIndex: number,
  deviceConnection: DeviceConnection,
  activeChainId: Cardano.ChainId,
  createWallet: SetupWalletProps<ObservableWallet, KeyManagement.KeyAgent>['createWallet'],
  connectedDevice: HardwareWallets
): Promise<Pick<CardanoWalletByChain, 'wallet' | 'keyAgent' | 'keyAgentsByChain'>> => {
  const keyAgentsByChain: KeyAgentsByChain = {} as KeyAgentsByChain;
  let activeChainName: ChainName;

  // Key agent for wallet to activate
  const { keyAgent: activeKeyAgent, wallet } = await setupWallet({
    createKeyAgent: async (dependencies) => {
      if (connectedDevice === KeyManagement.KeyAgentType.Ledger) {
        return await HardwareLedger.LedgerKeyAgent.createWithDevice(
          {
            communicationType: DEFAULT_COMMUNICATION_TYPE,
            accountIndex,
            deviceConnection: deviceConnection as HardwareLedger.LedgerKeyAgent['deviceConnection'],
            chainId: activeChainId
          },
          dependencies
        );
      }
      return await HardwareTrezor.TrezorKeyAgent.createWithDevice(
        {
          accountIndex,
          trezorConfig: TREZOR_CONFIG,
          chainId: activeChainId
        },
        dependencies
      );
    },
    createWallet,
    logger: console,
    bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
  });
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
        const { keyAgent } = await setupWallet({
          createKeyAgent: async (dependencies) => {
            if (connectedDevice === KeyManagement.KeyAgentType.Ledger) {
              // Cannot use `createWithDevice` several times because it throws a locked device error after the first one
              return await createWithLedgerDeviceConnection(
                {
                  communicationType: DEFAULT_COMMUNICATION_TYPE,
                  accountIndex,
                  chainId,
                  // Re-use public key from first key agent created
                  extendedAccountPublicKey: activeKeyAgent.extendedAccountPublicKey
                },
                deviceConnection,
                dependencies
              );
            }
            return await createWithTrezorDeviceConnection(
              {
                accountIndex,
                chainId,
                // Re-use public key from first key agent created
                extendedAccountPublicKey: activeKeyAgent.extendedAccountPublicKey,
                trezorConfig: TREZOR_CONFIG
              },
              dependencies
            );
          },
          createWallet,
          logger: console,
          bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
        });
        // Build object with key agents for all chains to be able to switch to eventually
        keyAgentsByChain[chainName as ChainName] = { keyAgentData: keyAgent.serializableData };
      })
  );

  return { wallet, keyAgent: activeKeyAgent, keyAgentsByChain };
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

  const createWallet = async () => wallet;
  const { keyAgent, keyAgentsByChain } = await createHardwareWalletsByChain(
    accountIndex,
    deviceConnection,
    activeChainId,
    createWallet,
    connectedDevice
  );

  const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  await walletManagerUi.activate({ keyAgent: asyncKeyAgent, observableWalletName: name });

  return { asyncKeyAgent, name, wallet, keyAgent, keyAgentsByChain };
};
