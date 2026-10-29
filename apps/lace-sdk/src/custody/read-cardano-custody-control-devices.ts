import { readCardanoCustodyControlUtxo } from '@lace-contract/cardano-context';
import { Err, Ok } from '@lace-lib/util';

import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { Result } from '@lace-lib/util';

export type ReadCardanoCustodyControlDevicesProps = {
  /** The account's public record, as JSON text or a parsed value. */
  accountRecord: unknown;
  chainId: Cardano.ChainId;
  /**
   * The account's control UTxO as the verifier reads it from the chain: the
   * UTxO at the account address that holds the account's state NFT, whose
   * policy id is the record's `accountValidatorHash` and whose asset name is
   * its `stakeScriptHash`.
   */
  controlUtxo: Cardano.Utxo;
};

/** Who controls a custody account, as its control UTxO states it. */
export type CardanoCustodyControlDevices = {
  /** The custody account address, re-derived from the record. */
  address: Cardano.PaymentAddress;
  /**
   * The device key hashes the control datum lists in its second field,
   * lower-case hex.
   */
  devices: Ed25519KeyHashHex[];
};

/**
 * Reads, without any network access, the devices a custody account's control
 * UTxO lists, for a server that verifies a custody data signature with
 * `verifyCardanoCustodyDataSignature`. The record is validated and its
 * address re-derived on `chainId`, and the UTxO must sit at that address,
 * hold exactly one state NFT and carry an inline datum that names, in its
 * first field, a logic in `CARDANO_CUSTODY_LOGIC_HASHES` and lists key
 * hashes in its second. Only those two fields are read: the contract keeps
 * them in place under every logic, while the rest of the state may change
 * shape. A logic the SDK does not accept may have admitted any device, so
 * its list proves nothing and is refused.
 *
 * It never throws. A refusal is a `CardanoCustodyRequestRefusedError` with
 * the code `custody-unsupported-version` for a record that names an unknown
 * contract version (reason `unsupported-contract-version`) or a datum that
 * names a logic the SDK does not accept (reason `unknown-logic`),
 * `custody-context-mismatch` for a record that does not re-derive on
 * `chainId` or a UTxO at another address, and `custody-malformed-datum` for
 * a UTxO without exactly one state NFT and an inline datum that names a
 * logic hash first and lists key hashes second.
 */
export const readCardanoCustodyControlDevices = (
  props: ReadCardanoCustodyControlDevicesProps,
): Result<CardanoCustodyControlDevices, Error> => {
  try {
    const { identity, devices } = readCardanoCustodyControlUtxo(props);
    return Ok({
      address: identity.address,
      devices: devices.map(device => device.toLowerCase() as Ed25519KeyHashHex),
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
