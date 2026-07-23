import {
  BitcoinNetwork,
  BitcoinNetworkId,
  BitcoinAccountId,
  type BitcoinBip32AccountProps,
} from '@lace-contract/bitcoin-context';
import { type HardwareWalletAccount } from '@lace-contract/wallet-repo';
import {
  assertSingleSigNativeSegwit,
  BitcoinUrType,
  decodeAccountExport,
  type DecodedHdKey,
} from '@lace-lib/bitcoin-air-gapped-protocol';

import { runAirGappedQrExchange } from '../shared/run-qr-exchange';
import { keystoneWalletId } from '../shared/wallet-id';

import type { WalletId } from '@lace-contract/wallet-repo';

/** SLIP-44 coin type for Bitcoin mainnet. */
const MAINNET_COIN_TYPE = 0;
/** SLIP-44 coin type for Bitcoin testnet. */
const TESTNET_COIN_TYPE = 1;

/** Result of a Bitcoin Keystone account-export QR exchange. */
export interface BitcoinAccountExportResult {
  /** Wallet id derived from the device master fingerprint (xfp). */
  walletId: WalletId;
  /** The decoded, validated single-sig native-segwit export. */
  key: DecodedHdKey;
  /** Network read from the export coin type (0 mainnet, 1 testnet). */
  network: BitcoinNetwork;
}

const networkForCoinType = (coinType: number): BitcoinNetwork => {
  switch (coinType) {
    case MAINNET_COIN_TYPE:
      return BitcoinNetwork.Mainnet;
    case TESTNET_COIN_TYPE:
      return BitcoinNetwork.Testnet;
    default:
      throw new Error(
        `Unsupported SLIP-44 coin type in account export: ${coinType}`,
      );
  }
};

/**
 * Runs the air-gapped import: scans the crypto-account QR shown by the
 * Keystone's connect-software-wallet screen (no request UR exists for Bitcoin;
 * the device pre-derives its xpubs). The export carries output descriptors for
 * several script types; the decoder selects the bare native-segwit (wpkh)
 * descriptor and rejects multisig and nested segwit. The wallet id is derived
 * from the device master fingerprint. Rejection errors
 * (WrongScriptTypeError / MultisigNotSupportedError) propagate to the caller.
 */
export const importBitcoinAccount =
  async (): Promise<BitcoinAccountExportResult> => {
    const { urType, cbor } = await runAirGappedQrExchange({
      request: { frames: [] },
      expectedResponseType: [BitcoinUrType.Hdkey, BitcoinUrType.Account],
      chainType: 'Bitcoin',
      titleKey: 'v2.keystone-bitcoin.import.title',
      instructionKey: 'v2.keystone-bitcoin.import.instruction',
    });
    const key = decodeAccountExport({ urType, cbor });
    assertSingleSigNativeSegwit(key);
    return {
      walletId: keystoneWalletId(key.sourceFingerprintHex),
      key,
      network: networkForCoinType(key.coinType),
    };
  };

/**
 * Builds a single watch-only Bitcoin hardware account for the network the
 * export belongs to. Only the native-segwit xpub is used from the device
 * export; the master fingerprint is stored so later PSBT signing can target
 * the device seed.
 */
export const buildBitcoinAccount = ({
  walletId,
  key,
  network,
  accountName,
}: {
  walletId: WalletId;
  key: DecodedHdKey;
  network: BitcoinNetwork;
  accountName: string;
}): HardwareWalletAccount<BitcoinBip32AccountProps> => {
  const networkId = BitcoinNetworkId(network);
  return {
    accountType: 'HardwareKeystone',
    blockchainName: 'Bitcoin',
    blockchainNetworkId: networkId,
    networkType: network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet',
    walletId,
    accountId: BitcoinAccountId(walletId, key.account, network),
    metadata: { name: accountName },
    blockchainSpecific: {
      accountIndex: key.account,
      extendedAccountPublicKeys: { nativeSegWit: key.xpubBase58 },
      networkId,
      masterFingerprint: key.sourceFingerprintHex,
    },
  };
};
