import { minAdaRequired } from '@cardano-sdk/tx-construction';
import {
  classifyCustodyAccountUtxos,
  decodeCustodyAccountState,
  decodeCustodyStateLogic,
  findCustodyContractVersion,
  findCustodyLogic,
} from '@lace-lib/cardano-custody';

import type { CardanoCustodyAccountProps } from '../types';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';
import type {
  CustodyAccountState,
  CustodyDecodeError,
  CustodyGrantUtxo,
  CustodyUtxoAnomaly,
} from '@lace-lib/cardano-custody';

/** Why the control state of a created custody account cannot be read. */
export type CardanoCustodyInvalidReason =
  /** The control UTxO carries no inline datum. */
  | { readonly code: 'missing-inline-datum' }
  /** More than one UTxO at the account address holds the state NFT. */
  | { readonly code: 'multiple-control-utxos' }
  | { readonly code: 'undecodable-state'; readonly error: CustodyDecodeError }
  /**
   * The control datum names a logic outside the contract version's
   * catalogue, so its other fields follow rules Lace has not reviewed and
   * prove nothing, the device list included. The holdings still count;
   * no operation runs on the account.
   */
  | { readonly code: 'unknown-logic'; readonly logic: HexBlob };

/**
 * The UTxOs at the account address other than the control UTxO, by who may
 * spend them, and the rewards of the account's stake credential.
 */
type CardanoCustodyAccountHoldings = {
  /**
   * Plain UTxOs: no account token and no datum. Agents spend them within
   * their grants, and devices spend those without a reference script.
   */
  readonly funds: readonly Cardano.Utxo[];
  /**
   * UTxOs without an account token under an inline datum. Only a device
   * spends them. `own` carry exactly the datum `d87980` and no reference
   * script; `foreign` carry any other datum or a reference script, which
   * raises the fee and minimum lovelace of spending them.
   */
  readonly reserves: {
    readonly own: readonly Cardano.Utxo[];
    readonly foreign: readonly Cardano.Utxo[];
  };
  /**
   * UTxOs holding one grant token of the account, with the grant their
   * datum carries, in slot order. The grantee spends one while its grant is
   * current; a device sweeps it once the grant is dead, and only then is
   * its lovelace free again.
   */
  readonly grants: readonly CustodyGrantUtxo[];
  /** The lovelace of every grant UTxO, held until the grant is swept. */
  readonly grantLockedLovelace: bigint;
  /**
   * Deposits under a datum hash. Spending one needs the datum, which the
   * chain does not reveal, so Lace treats them as lost.
   */
  readonly stranded: readonly Cardano.Utxo[];
  /**
   * UTxOs holding an account token in a shape the contract rules out.
   * Each means a broken assumption, so Lace lists them and spends none.
   */
  readonly anomalies: readonly CustodyUtxoAnomaly[];
  /** Lovelace in the reward account, which only a listed device can withdraw. */
  readonly withdrawableRewards: bigint;
};

/**
 * What a custody account holds and the state its control UTxO carries.
 *
 * - `notCreated`: no UTxO at the address holds the state NFT. Deposits made
 *   now cannot be spent until the account is created, and may never be.
 * - `live`: exactly one control UTxO with a decodable inline state.
 * - `invalid`: the control UTxO is ambiguous, its state unreadable, or its
 *   state under a logic Lace does not accept.
 */
export type CardanoCustodyAccountState = CardanoCustodyAccountHoldings &
  (
    | {
        readonly status: 'invalid';
        readonly reason: CardanoCustodyInvalidReason;
        readonly controlUtxos: readonly Cardano.Utxo[];
      }
    | {
        readonly status: 'live';
        readonly controlUtxo: Cardano.Utxo;
        /** The control state, under a logic of the contract version's catalogue. */
        readonly state: CustodyAccountState;
        /**
         * The least lovelace the control UTxO may hold with its current
         * state: the ledger minimum of its output. It is locked for the
         * account's life and grows with the state.
         */
        readonly controlMinimumLovelace: bigint;
        /**
         * The control UTxO's lovelace above `controlMinimumLovelace`, or 0
         * when it holds less. It is the owner's fee reserve: an owner
         * operation that its own reserves and its plain funds without a
         * reference script cannot pay for takes its fee from here. Agents
         * never reach it.
         */
        readonly controlHeadroomLovelace: bigint;
        /**
         * Whether the state lists the bound device key, which is what grants
         * owner authority. Absent for an observer, which has no device.
         */
        readonly currentDeviceListed?: boolean;
      }
    | { readonly status: 'notCreated' }
  );

type CardanoCustodyAccountStateInput = {
  readonly account: Pick<
    CardanoCustodyAccountProps,
    'accountValidatorHash' | 'address' | 'device' | 'stakeScriptHash'
  >;
  /** The account's UTxOs; any not at its exact address are ignored. */
  readonly utxos: readonly Cardano.Utxo[];
  readonly withdrawableRewards: bigint;
  /** The parameters of the account's network that price the control output. */
  readonly protocolParameters: Pick<
    Cardano.ProtocolParameters,
    'coinsPerUtxoByte'
  >;
};

/** Whether the account's contract version lists the logic in its catalogue. */
const isKnownLogic = (accountValidatorHash: string, logic: string): boolean => {
  const version = findCustodyContractVersion(accountValidatorHash);
  return version.ok && findCustodyLogic(version.value, logic).ok;
};

/**
 * Classifies a custody account's UTxOs by the rules of the custody contract
 * and reads the control state.
 */
export const classifyCardanoCustodyAccount = ({
  account,
  utxos,
  withdrawableRewards,
  protocolParameters,
}: CardanoCustodyAccountStateInput): CardanoCustodyAccountState => {
  const { controls, grants, reserves, funds, stranded, anomalies } =
    classifyCustodyAccountUtxos(account, utxos);
  const holdings: CardanoCustodyAccountHoldings = {
    funds,
    reserves,
    grants,
    grantLockedLovelace: grants.reduce(
      (total, { utxo: [, output] }) => total + output.value.coins,
      0n,
    ),
    stranded,
    anomalies,
    withdrawableRewards,
  };

  if (controls.length === 0) return { ...holdings, status: 'notCreated' };
  const invalid = (reason: CardanoCustodyInvalidReason) => ({
    ...holdings,
    status: 'invalid' as const,
    reason,
    controlUtxos: controls,
  });
  if (controls.length > 1) {
    return invalid({ code: 'multiple-control-utxos' });
  }

  const [controlUtxo] = controls;
  const [, controlOutput] = controlUtxo;
  if (controlOutput.datum === undefined) {
    return invalid({ code: 'missing-inline-datum' });
  }
  // The logic is read first: under a logic Lace does not accept, the rest
  // of the datum may follow another layout.
  const logic = decodeCustodyStateLogic(controlOutput.datum);
  if (!logic.ok) {
    return invalid({ code: 'undecodable-state', error: logic.error });
  }
  if (!isKnownLogic(account.accountValidatorHash, logic.value)) {
    return invalid({ code: 'unknown-logic', logic: logic.value });
  }
  const decoded = decodeCustodyAccountState(controlOutput.datum);
  if (!decoded.ok) {
    return invalid({ code: 'undecodable-state', error: decoded.error });
  }

  const controlMinimumLovelace = minAdaRequired(
    controlOutput,
    BigInt(protocolParameters.coinsPerUtxoByte),
  );
  const controlLovelace = controlOutput.value.coins;
  const deviceKeyHash = account.device?.keyHash;
  return {
    ...holdings,
    status: 'live',
    controlUtxo,
    state: decoded.value,
    controlMinimumLovelace,
    controlHeadroomLovelace:
      controlLovelace > controlMinimumLovelace
        ? controlLovelace - controlMinimumLovelace
        : 0n,
    ...(deviceKeyHash !== undefined && {
      currentDeviceListed: decoded.value.devices.some(
        device => device.toLowerCase() === deviceKeyHash.toLowerCase(),
      ),
    }),
  };
};
