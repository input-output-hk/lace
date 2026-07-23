import {
  allSupportedNetworks,
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
  supportedNetworkIds,
} from '@lace-contract/bitcoin-context';
import { createBlockchainNetworkTargetResolver } from '@lace-contract/network';
import {
  serializeExtendedPublicKey,
  XPUB_VERSION_MAINNET,
} from '@lace-lib/bitcoin-air-gapped-protocol';

import { coinNameFor } from './coin-name';

import type {
  TrezorBitcoinConnect,
  TrezorHdNode,
} from '../trezor-bitcoin-connect';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';
import type {
  HardwareWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

export interface BitcoinHwAccountConnectorDependencies {
  /** Resolves the platform's already-initialized Trezor Connect instance. */
  getConnect: () => Promise<TrezorBitcoinConnect>;
}

const resolveTargetNetworks = createBlockchainNetworkTargetResolver(
  supportedNetworkIds,
  allSupportedNetworks,
);

/** BIP-32 version bytes for a testnet extended public key (tpub). */
const XPUB_VERSION_TESTNET = 0x04_35_87_cf;

/** SLIP-44 coin type for the given Bitcoin network (0 mainnet, 1 testnet). */
const coinTypeFor = (network: BitcoinNetwork): number =>
  network === BitcoinNetwork.Mainnet ? 0 : 1;

/** BIP-84 native-segwit account derivation path, e.g. "m/84'/0'/0'". */
const nativeSegWitPath = (network: BitcoinNetwork, accountIndex: number) =>
  `m/84'/${coinTypeFor(network)}'/${accountIndex}'`;

/**
 * Depth-1 probe used to learn the master fingerprint. A Trezor HDNode carries
 * the fingerprint of its PARENT node, so the node at m/84' exposes the master
 * key fingerprint without exporting the root public key.
 */
const MASTER_FINGERPRINT_PROBE_PATH = "m/84'";

/** Formats a BIP-32 fingerprint (uint32) as 8-char lowercase hex. */
const fingerprintToHex = (fingerprint: number): string =>
  fingerprint.toString(16).padStart(8, '0');

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(Buffer.from(hex, 'hex'));

/**
 * Serializes the plain (xpub/tpub) base58 extended key from the structured
 * HDNode fields. Trezor pairs BIP-84 paths with segwit version bytes
 * (zpub/vpub) in parts of its response and Lace address derivation accepts
 * only the plain versions, so the key is rebuilt from fields rather than
 * trusting the version bytes of the returned strings.
 */
const plainNativeSegWitXpub = (
  node: TrezorHdNode,
  network: BitcoinNetwork,
): string =>
  serializeExtendedPublicKey({
    version:
      network === BitcoinNetwork.Mainnet
        ? XPUB_VERSION_MAINNET
        : XPUB_VERSION_TESTNET,
    depth: node.depth,
    parentFingerprint: node.fingerprint,
    childNumber: node.childNum,
    chainCode: hexToBytes(node.chainCode),
    publicKey: hexToBytes(node.publicKey),
  });

/** Keys exported from the device for one account index. */
export interface BitcoinDeviceExport {
  /** Device master fingerprint (xfp) as 8-char lowercase hex. */
  masterFingerprint: string;
  /** Trezor device_id from the response envelope, when the host provides it. */
  deviceId?: string;
  /** One plain (xpub/tpub) native-segwit account xpub per target network. */
  keys: { network: BitcoinNetwork; nativeSegWit: string }[];
}

/**
 * Fetches the master fingerprint and the BIP-84 native-segwit account xpub of
 * every target network in a single getPublicKey bundle, so the exchange costs
 * one user interaction (one popup on web, one deep-link round-trip on mobile).
 */
export const exportBitcoinAccountKeys = async (
  connect: TrezorBitcoinConnect,
  props: { accountIndex: number; targetNetworks?: Set<BlockchainNetworkId> },
): Promise<BitcoinDeviceExport> => {
  const networks = resolveTargetNetworks(props.targetNetworks);
  const response = await connect.getPublicKey({
    bundle: [
      { path: MASTER_FINGERPRINT_PROBE_PATH, showOnTrezor: false },
      ...networks.map(network => ({
        path: nativeSegWitPath(network, props.accountIndex),
        coin: coinNameFor(network),
        showOnTrezor: false,
      })),
    ],
  });
  if (!response.success) {
    throw new Error(`Trezor getPublicKey failed: ${response.payload.error}`);
  }
  const device = response.device as
    | { features?: { device_id?: string | null } }
    | undefined;
  const [probeNode, ...accountNodes] = response.payload;
  return {
    masterFingerprint: fingerprintToHex(probeNode.fingerprint),
    deviceId: device?.features?.device_id ?? undefined,
    keys: networks.map((network, index) => ({
      network,
      nativeSegWit: plainNativeSegWitXpub(accountNodes[index], network),
    })),
  };
};

/** Builds one watch-only hardware account per exported network key. */
export const buildBitcoinAccounts = (props: {
  walletId: WalletId;
  accountIndex: number;
  accountName: string;
  deviceExport: BitcoinDeviceExport;
}): HardwareWalletAccount<BitcoinBip32AccountProps>[] =>
  props.deviceExport.keys.map(({ network, nativeSegWit }) => {
    const networkId = BitcoinNetworkId(network);
    return {
      accountType: 'HardwareTrezor',
      blockchainName: 'Bitcoin',
      blockchainNetworkId: networkId,
      networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
      walletId: props.walletId,
      accountId: BitcoinAccountId(props.walletId, props.accountIndex, network),
      metadata: { name: props.accountName },
      blockchainSpecific: {
        accountIndex: props.accountIndex,
        extendedAccountPublicKeys: { nativeSegWit },
        networkId,
        masterFingerprint: props.deviceExport.masterFingerprint,
      } satisfies BitcoinBip32AccountProps,
    };
  });

/**
 * Bitcoin Trezor account connector. Only the native-segwit xpub is exported;
 * the master fingerprint is stored so later PSBT signing can target the
 * device seed.
 */
export const makeBitcoinHwAccountConnector = ({
  getConnect,
}: BitcoinHwAccountConnectorDependencies): HwAccountConnector => ({
  blockchainName: 'Bitcoin',
  connectHardwareAccounts: async (_state, props) => {
    const connect = await getConnect();
    const deviceExport = await exportBitcoinAccountKeys(connect, {
      accountIndex: props.accountIndex,
      targetNetworks: props.targetNetworks,
    });
    return buildBitcoinAccounts({
      walletId: props.walletId,
      accountIndex: props.accountIndex,
      accountName: props.accountName,
      deviceExport,
    });
  },
});
