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
  KeystoneUrType,
  parseAccountResponse,
  Xfp,
  type ParsedAccountResponse,
} from '@lace-lib/cardano-keystone-protocol';

import {
  KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX,
  KEYSTONE_REQUEST_ORIGIN,
} from '../const';
import { runAirGappedQrExchange } from '../shared/run-qr-exchange';
import { keystoneWalletId } from '../shared/wallet-id';

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

const toExportedKeys = (
  response: ParsedAccountResponse,
): ExportedAccountKey[] => {
  const masterFingerprint = MasterFingerprint(
    Xfp.toHex(response.masterFingerprint),
  );
  return response.accounts.map(key => ({
    accountIndex: key.accountIndex,
    extendedAccountPublicKey: Bip32PublicKeyHex(
      Buffer.from(key.extendedPublicKey).toString('hex'),
    ),
    masterFingerprint,
  }));
};

/**
 * Runs the air-gapped account-export QR exchange for the given account indices.
 * Builds the qr-hardware-call key derivation request, displays it as an
 * animated QR for the device to scan and approve, then scans the device's
 * crypto-multi-accounts reply and returns the parsed account keys plus the
 * wallet id derived from the device master fingerprint (xfp). The reply
 * carries no request correlation id, so validation relies on the protocol
 * parser's structural checks and on rejecting keys whose account index was
 * not requested.
 *
 * Propagates {@link AirGappedQrExchangeCancelledError} on cancel and throws on
 * a malformed or mismatched response.
 */
export const exportAccounts = async (
  accountIndices: readonly number[],
): Promise<AccountExportResult> => {
  if (accountIndices.length === 0) {
    throw new Error('Keystone account export requires an account index');
  }
  const overCap = accountIndices.find(
    index => index > KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX,
  );
  if (overCap !== undefined) {
    throw new Error(
      `Keystone can only derive Cardano accounts #0-#${KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX}, requested #${overCap}`,
    );
  }
  const request = buildAccountRequest({
    accountIndexes: accountIndices,
    origin: KEYSTONE_REQUEST_ORIGIN,
  });
  const result = await runAirGappedQrExchange({
    request: { urType: request.urType, cbor: request.cbor },
    expectedResponseType: KeystoneUrType.AccountResponse,
  });
  const parsed = parseAccountResponse(result);
  const unexpectedKey = parsed.accounts.find(
    key => !accountIndices.includes(key.accountIndex),
  );
  if (unexpectedKey) {
    throw new Error(
      `Keystone exported account index ${
        unexpectedKey.accountIndex
      }, expected ${accountIndices.join(', ')}`,
    );
  }
  const keys = toExportedKeys(parsed);
  return {
    walletId: keystoneWalletId(keys[0].masterFingerprint),
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
      accountType: 'HardwareKeystone' as const,
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
