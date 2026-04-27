import { Cardano } from '@cardano-sdk/core';

import type { CardanoAddressData } from '../../types';
import type * as Crypto from '@cardano-sdk/crypto';
import type { AnyAddress } from '@lace-contract/addresses';

/**
 * Represents a payment credential extracted from a Cardano address.
 */
export interface PaymentCredential {
  hash: Crypto.Hash28ByteBase16;
  type: Cardano.CredentialType;
}

/**
 * Helper function to extract credential from a specific address type.
 * Reduces nested conditionals by handling the extraction logic in one place.
 */
const tryExtractCredential = (
  addressType:
    | Cardano.BaseAddress
    | Cardano.EnterpriseAddress
    | Cardano.PointerAddress
    | undefined,
): PaymentCredential | undefined => {
  if (!addressType) return undefined;

  const cred = addressType.getPaymentCredential();
  if (!cred) return undefined;

  return {
    hash: cred.hash,
    type: cred.type,
  };
};

/**
 * Extracts the payment credential from a Cardano address.
 *
 * This function handles base, enterprise, and pointer address types.
 * It returns the credential with both hash and type information, allowing
 * the caller to distinguish between KeyHash and ScriptHash credentials.
 *
 * @param inputAddress - A Cardano address object or Bech32 string
 * @returns The payment credential with hash and type, or undefined if unparseable
 */
export const extractPaymentCredential = (
  inputAddress: Cardano.Address | string,
): PaymentCredential | undefined => {
  try {
    const addressObject =
      typeof inputAddress === 'string'
        ? Cardano.Address.fromBech32(inputAddress)
        : inputAddress;

    // Try each address type in order (base is most common)
    return (
      tryExtractCredential(addressObject.asBase()) ??
      tryExtractCredential(addressObject.asEnterprise()) ??
      tryExtractCredential(addressObject.asPointer())
    );
  } catch {
    // Invalid/unparseable address
    return undefined;
  }
};

/**
 * Extracts payment key hashes from all KeyHash addresses in an account.
 *
 * This function builds a Set of payment key hashes (only KeyHash type, not ScriptHash)
 * from the user's discovered addresses, which can be used for efficient O(1) lookup
 * when filtering UTxOs.
 *
 * Script addresses are not included because they use ScriptHash credentials which
 * are handled differently - any script address with the user's stake key is considered
 * legitimate regardless of the payment script.
 *
 * @param addresses - Array of addresses belonging to an account
 * @returns Set of payment key hashes (KeyHash type only) owned by the user
 */
export const extractOwnedPaymentCredentials = (
  addresses: AnyAddress<CardanoAddressData>[],
): Set<Crypto.Ed25519KeyHashHex> => {
  const credentials = addresses
    .map(addr => extractPaymentCredential(addr.address))
    .filter(
      (cred): cred is PaymentCredential =>
        cred !== undefined && cred.type === Cardano.CredentialType.KeyHash,
    )
    .map(cred => cred.hash as Crypto.Ed25519KeyHashHex);

  return new Set(credentials);
};

/**
 * Filters UTxOs to separate legitimate UTxOs from franken address UTxOs.
 *
 * A "franken address" is created when someone combines the user's stake credential
 * with a payment credential the user doesn't control. This function filters out such
 * UTxOs by only accepting UTxOs with KeyHash payment credentials that match the user's
 * owned credentials.
 *
 * Filtering logic:
 * - Only UTxOs with KeyHash credentials that match owned credentials are legitimate
 * - Everything else is filtered as franken:
 *   - Unparseable addresses
 *   - ScriptHash credentials (app doesn't support script/multi-sig wallets yet)
 *   - KeyHash credentials not owned by the user
 *
 * @param utxos - Array of UTxOs fetched from the blockchain
 * @param ownedCredentials - Set of payment key hashes (KeyHash type only) owned by the user
 * @returns Object containing arrays of legitimate and franken UTxOs
 */
export const filterFrankenUtxos = (
  utxos: Cardano.Utxo[],
  ownedCredentials: Set<Crypto.Ed25519KeyHashHex>,
): {
  legitimate: Cardano.Utxo[];
  franken: Cardano.Utxo[];
} => {
  const legitimate: Cardano.Utxo[] = [];
  const franken: Cardano.Utxo[] = [];

  for (const utxo of utxos) {
    // Extract address from UTxO output (utxo[1] is TxOut with address property)
    const address = utxo[1].address;

    // Extract payment credential from the UTxO's address
    const paymentCredential = extractPaymentCredential(address);

    // Only accept KeyHash credentials that the user owns
    // Everything else (undefined, ScriptHash, or non-owned KeyHash) is franken
    if (
      paymentCredential?.type === Cardano.CredentialType.KeyHash &&
      ownedCredentials.has(paymentCredential.hash as Crypto.Ed25519KeyHashHex)
    ) {
      legitimate.push(utxo);
    } else {
      franken.push(utxo);
    }
  }

  return { legitimate, franken };
};
