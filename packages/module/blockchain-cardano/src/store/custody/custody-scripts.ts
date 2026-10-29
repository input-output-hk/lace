import { Cardano, Serialization } from '@cardano-sdk/core';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import {
  custodyReferenceScriptUtxos,
  encodeCustodyLogicRedeemer,
  findCustodyLogic,
} from '@lace-lib/cardano-custody';
import { BigNumber } from '@lace-lib/util';

import { failCustodyBuild } from './build-failure';
import { readFromProvider } from './custody-chain';

import type { CustodyAccountContext } from './custody-account';
import type { CustodyWithdrawal } from './custody-assembly';
import type { CustodyChain } from './custody-chain';
import type {
  CustodyContractVersion,
  CustodyLogic,
} from '@lace-lib/cardano-custody';

/**
 * How a transaction carries the contract scripts it runs. A script the
 * contract version parks on the chain's network is read from its parked
 * UTxO as a reference input; any other is attached to the witness set.
 */
export interface CustodyScriptWitnesses {
  readonly attached: readonly Cardano.PlutusScript[];
  /** The parked UTxOs, rebuilt from the pinned catalogue. */
  readonly referenced: readonly Cardano.Utxo[];
}

const scriptHashOf = (script: Cardano.Script): string =>
  Serialization.Script.fromCore(script).hash();

/**
 * The catalogue pins each parked UTxO's address and lovelace with its
 * outref, so the builder prices its script without a chain lookup; the
 * provider's evaluation of every build resolves the outref on chain, so a
 * UTxO the chain no longer holds fails the build before anyone signs.
 */
export const custodyScriptWitnesses = (
  version: CustodyContractVersion,
  { chainId }: Pick<CustodyChain, 'chainId'>,
  scripts: readonly Cardano.PlutusScript[],
): CustodyScriptWitnesses => {
  const parked = new Map(
    custodyReferenceScriptUtxos(version, chainId.networkMagic).map(
      utxo => [scriptHashOf(utxo[1].scriptReference!), utxo] as const,
    ),
  );
  const attached: Cardano.PlutusScript[] = [];
  const referenced: Cardano.Utxo[] = [];
  for (const script of scripts) {
    const reference = parked.get(scriptHashOf(script));
    if (reference) {
      referenced.push(reference);
    } else {
      attached.push(script);
    }
  }
  return { attached, referenced };
};

/**
 * The logic run of one transaction: the withdrawal from the logic's script
 * stake credential, with `Run`, that makes the ledger run the logic. The
 * ledger accepts only the whole reward balance, so it draws what the
 * provider reports: normally nothing, though anyone can credit the
 * account, as a pool's reward account for one. The drawn lovelace joins
 * the transaction's balance, which returns to the account address.
 */
export interface CustodyLogicRun {
  readonly logic: CustodyLogic;
  readonly withdrawal: CustodyWithdrawal;
}

const LOGIC_RUN_REDEEMER = encodeCustodyLogicRedeemer();

/**
 * Reads the logic's reward account once per transaction, so every build
 * round of it draws the same amount. A credential that is not registered
 * fails the build as `logic-not-registered`: the ledger would refuse the
 * withdrawal only at submission, after the sponsor and the device signed.
 * Registration is read, not delegation: the logic delegates to no pool.
 */
export const readCustodyLogicRun = async (
  logic: CustodyLogic,
  { chainId, provider }: Pick<CustodyChain, 'chainId' | 'provider'>,
): Promise<CustodyLogicRun> => {
  const rewardAccount = Cardano.RewardAccount.fromCredential(
    { type: Cardano.CredentialType.ScriptHash, hash: logic.hash },
    chainId.networkId,
  );
  const { isRegistered, withdrawableAmount } = await readFromProvider(
    'Custody logic reward account',
    () =>
      provider.getRewardAccountInfo(
        { rewardAccount: CardanoRewardAccount(rewardAccount) },
        { chainId },
      ),
  );
  if (!isRegistered) {
    return failCustodyBuild({ code: 'logic-not-registered', rewardAccount });
  }
  return {
    logic,
    withdrawal: {
      rewardAccount,
      quantity: BigNumber.valueOf(withdrawableAmount),
      redeemer: LOGIC_RUN_REDEEMER,
    },
  };
};

/**
 * The logic the account's control datum names. Lace operates no account
 * under a logic outside its contract version's catalogue, whose rules it
 * has not reviewed.
 */
export const accountLogicOf = ({
  identity,
  state,
}: Pick<CustodyAccountContext, 'identity' | 'state'>): CustodyLogic => {
  const logic = findCustodyLogic(identity.contractVersion, state.logic);
  return logic.ok
    ? logic.value
    : failCustodyBuild({ code: 'account-not-live', status: 'invalid' });
};
