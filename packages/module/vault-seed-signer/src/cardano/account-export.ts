import { Buffer } from 'buffer';

import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import {
  CardanoAccountId,
  getNetworkDetails,
  MasterFingerprint,
  type CardanoBip32AccountProps,
} from '@lace-contract/cardano-context';
import {
  type HardwareWalletAccount,
  type WalletId,
} from '@lace-contract/wallet-repo';
import {
  buildAccountRequest,
  CardanoUrType,
  parseAccountResponse,
  RequestId,
  type ParsedAccountResponse,
} from '@lace-lib/cardano-seed-signer-protocol';
import { v4 } from 'uuid';

import { runAirGappedQrExchange } from '../shared/run-qr-exchange';
import { seedSignerWalletId } from '../shared/wallet-id';

import type { State } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';

/** Resolved account export key: account index, xpub hex, and master fingerprint. */
export interface ExportedAccountKey {
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint: MasterFingerprint;
}

/** Result of an account-export QR exchange. */
export interface AccountExportResult {
  /** Wallet id derived from the device master fingerprint (xfp). */
  walletId: WalletId;
  keys: ExportedAccountKey[];
}

const toBip32PublicKeyHex = (xpub: Uint8Array): Bip32PublicKeyHex =>
  Bip32PublicKeyHex(Buffer.from(xpub).toString('hex'));

const toMasterFingerprint = (xfp: Uint8Array): MasterFingerprint =>
  MasterFingerprint(Buffer.from(xfp).toString('hex'));

const toExportedKeys = (
  response: ParsedAccountResponse,
): ExportedAccountKey[] => {
  if (response.keys.length === 0) {
    throw new Error('Seed signer account export returned no keys');
  }
  const masterFingerprint = toMasterFingerprint(response.masterFingerprint);
  return response.keys.map(key => ({
    accountIndex: key.accountIndex,
    extendedAccountPublicKey: toBip32PublicKeyHex(key.xpub),
    masterFingerprint,
  }));
};

/**
 * Runs the air-gapped account-export QR exchange for the given account indices.
 * Builds the cardano-account-req, displays it as an animated QR, scans the
 * device's cardano-account reply, and returns the parsed account keys plus the
 * wallet id derived from the device master fingerprint (xfp).
 *
 * Propagates {@link AirGappedQrExchangeCancelledError} on cancel and throws on
 * a malformed or mismatched response.
 */
export const exportAccounts = async (
  accountIndices: readonly number[],
): Promise<AccountExportResult> => {
  if (accountIndices.length === 0) {
    throw new Error('Seed signer account export requires an account index');
  }
  const requestId = RequestId(v4());
  const request = buildAccountRequest(accountIndices, { requestId });
  const { cbor: responseCbor } = await runAirGappedQrExchange({
    request: { urType: request.urType, cbor: request.cbor },
    expectedResponseType: CardanoUrType.Account,
  });
  const parsed = parseAccountResponse(responseCbor);
  if (parsed.requestId !== requestId) {
    throw new Error(
      `Seed signer returned a stale or mismatched response: expected request id ${requestId}, got ${parsed.requestId}`,
    );
  }
  const unexpectedKey = parsed.keys.find(
    key => !accountIndices.includes(key.accountIndex),
  );
  if (unexpectedKey) {
    throw new Error(
      `Seed signer exported account index ${
        unexpectedKey.accountIndex
      }, expected ${accountIndices.join(', ')}`,
    );
  }
  const keys = toExportedKeys(parsed);
  return {
    walletId: seedSignerWalletId(keys[0].masterFingerprint),
    keys,
  };
};

/**
 * Builds watch-only Cardano hardware accounts from an exported account key, one
 * per target network. Stores the xpub and master fingerprint so later signing
 * can target the device seed.
 */
export const buildCardanoAccounts = (
  state: State,
  {
    walletId,
    key,
    accountName,
    targetNetworks,
  }: {
    walletId: WalletId;
    key: ExportedAccountKey;
    accountName: string;
    targetNetworks: Set<BlockchainNetworkId>;
  },
): HardwareWalletAccount[] =>
  [...targetNetworks].map(targetNetworkId => {
    const { chainId, networkId, networkType } = getNetworkDetails(
      state,
      targetNetworkId,
    );

    return {
      networkType,
      blockchainNetworkId: networkId,
      accountType: 'HardwareSeedSigner' as const,
      walletId,
      accountId: CardanoAccountId(
        walletId,
        key.accountIndex,
        chainId.networkMagic,
      ),
      blockchainName: 'Cardano',
      metadata: { name: accountName },
      blockchainSpecific: {
        chainId,
        accountIndex: key.accountIndex,
        extendedAccountPublicKey: key.extendedAccountPublicKey,
        masterFingerprint: key.masterFingerprint,
        networkId,
      } satisfies CardanoBip32AccountProps,
    };
  });
