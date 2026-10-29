import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  createCustodyAccountRecord,
  createInitialCustodyAccountState,
  encodeCustodyMintRedeemer,
  encodeCustodyStakeRedeemer,
  findCustodyLogic,
} from '@lace-lib/cardano-custody';

import { failCustodyBuild, transitioned } from './build-failure';
import {
  changeReserveAt,
  controlLovelaceFor,
  controlOutputOf,
  preEvaluationFeeBound,
  resolvedInputsOf,
  scriptCredentialOf,
} from './custody-assembly';
import { validitySlotFor } from './custody-chain';
import { readCustodyCreatorIndex } from './custody-creator-index';
import { buildWithEvaluatedBudgets } from './custody-evaluation';
import {
  custodyExecutionEstimate,
  estimateWithinLimit,
} from './custody-execution-estimate';
import { custodyScriptWitnesses, readCustodyLogicRun } from './custody-scripts';
import { finalizeCustodyBuild } from './custody-validation';

import type { CustodyChain } from './custody-chain';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoCustodyBuildResult,
  CardanoCustodyCreateOperation,
  CardanoCustodyFeeFunding,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountIdentity,
  CustodyDeviceKey,
} from '@lace-lib/cardano-custody';

/**
 * Lovelace a creation leaves unused below the sponsor's per-transaction
 * limit. It absorbs a fee that comes out slightly higher on the round that
 * settles the control lovelace, so that round still fits the limit.
 */
const CUSTODY_CREATION_SPONSOR_MARGIN = 100_000n;

/**
 * Builds of one creation before the control lovelace settles. The first
 * build prices the largest fee its execution estimate allows, so it fits
 * any fee within that estimate; the second claims the headroom the real fee
 * leaves; the third covers a fee that then moved by more than the margin.
 */
const MAX_HEADROOM_ROUNDS = 3;

/**
 * Creator indices one creation request examines before it gives up. Only a
 * run of pre-registered indices reaches it, since the first unregistered
 * index is built on; the bound keeps a misbehaving provider from turning one
 * request into an unbounded number of reads.
 */
export const CUSTODY_CREATION_SCAN_LIMIT = 100;

/**
 * The first hardened derivation index. Creator keys derive softly from the
 * device's account key, so a scan must end below it.
 */
export const FIRST_HARDENED_INDEX = 0x80_00_00_00;

interface CreatorCandidate {
  readonly index: number;
  readonly key: CustodyDeviceKey;
  readonly identity: CustodyAccountIdentity;
}

/**
 * The first creator index from `startIndex` whose stake credential is not
 * registered. A registered credential whose address holds the state NFT is
 * an existing account the caller should reopen; one without it was
 * registered by someone else first, which blocks creation there forever,
 * so the scan moves past it.
 */
const findCreatorIndex = async (
  { deviceAccountPublicKey, startIndex = 0 }: CardanoCustodyCreateOperation,
  chain: CustodyChain,
): Promise<CreatorCandidate> => {
  for (
    let index = startIndex;
    index < startIndex + CUSTODY_CREATION_SCAN_LIMIT;
    index++
  ) {
    const found = await readCustodyCreatorIndex(
      {
        contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
        deviceAccountPublicKey,
        creatorIndex: index,
      },
      chain,
    );
    if (found.status === 'unregistered') {
      return { index, key: found.key, identity: found.identity };
    }
    if (found.status === 'account') {
      return failCustodyBuild({
        code: 'account-exists',
        creatorIndex: index,
        record: found.record,
      });
    }
  }
  return failCustodyBuild({
    code: 'index-exhausted',
    startIndex,
    scanned: CUSTODY_CREATION_SCAN_LIMIT,
  });
};

/** What the control lovelace of a creation is chosen from. */
interface HeadroomBounds {
  readonly maxSponsoredLovelace: bigint;
  readonly deposit: bigint;
  /**
   * The most the fee UTxO can put in the control output: balancing first
   * prices the largest fee the execution estimate allows, and the change
   * must still hold its minimum ADA.
   */
  readonly fundable: bigint;
  /** The initial state's minimum lovelace. */
  readonly minimum: bigint;
}

const smaller = (a: bigint, b: bigint): bigint => (a < b ? a : b);

/**
 * The control lovelace a creation aims for once its fee is known: what the
 * sponsor's limit leaves after the fee, the stake deposit and the margin,
 * within what the fee UTxO can fund, but never less than the initial
 * state's minimum.
 */
const headroomControlLovelace = (
  { maxSponsoredLovelace, deposit, fundable, minimum }: HeadroomBounds,
  fee: bigint,
): bigint => {
  const target = smaller(
    maxSponsoredLovelace - deposit - fee - CUSTODY_CREATION_SPONSOR_MARGIN,
    fundable,
  );
  return target > minimum ? target : minimum;
};

/**
 * Builds the creation of a custody account in the sponsor's fee mode: the
 * leased fee UTxO pays the fee, the stake deposit and the control output,
 * and its change returns to the sponsor in one output. The state NFT is
 * minted with `CreateAccount`, the stake credential is registered in the
 * same transaction with a Conway registration certificate, which carries
 * the `Operate` witness the mint looks for, and the logic the state names
 * runs through its withdrawal, which validates the new state. The creator
 * key is the only device and the only required signer, and the state
 * starts under the current logic at generation 0 with no slot issued, none
 * revoked and none outstanding.
 *
 * The proxy and the logic are read from their parked UTxOs on a network
 * that has them, and attached elsewhere; the stake script, applied to the
 * creator key, is always attached. Whatever the logic run draws joins the
 * control output, so the sponsor pays the same.
 */
export const buildCustodyCreation = async (
  operation: CardanoCustodyCreateOperation,
  funding: CardanoCustodyFeeFunding,
  chain: CustodyChain,
): Promise<CardanoCustodyBuildResult> => {
  const startIndex = operation.startIndex ?? 0;
  if (
    !Number.isSafeInteger(startIndex) ||
    startIndex < 0 ||
    startIndex + CUSTODY_CREATION_SCAN_LIMIT > FIRST_HARDENED_INDEX
  ) {
    return failCustodyBuild({
      code: 'invalid-operation',
      reason: 'invalid-start-index',
      message: `Invalid creator start index ${startIndex}`,
    });
  }
  const contractVersion = CURRENT_CUSTODY_CONTRACT_VERSION;
  const currentLogic = findCustodyLogic(
    contractVersion,
    contractVersion.currentLogicHash,
  );
  if (!currentLogic.ok) {
    throw new Error(
      `The contract version has no logic ${contractVersion.currentLogicHash}`,
    );
  }
  const logicRun = await readCustodyLogicRun(currentLogic.value, chain);
  const { index, key, identity } = await findCreatorIndex(operation, chain);
  const { protocolParameters: parameters } = chain;
  const state = transitioned(
    createInitialCustodyAccountState(key.keyHash, logicRun.logic.hash),
  );
  const witnesses = custodyScriptWitnesses(contractVersion, chain, [
    contractVersion.accountValidator,
    logicRun.logic.script,
  ]);
  const drawn = logicRun.withdrawal.quantity;
  const deposit = BigInt(parameters.stakeKeyDeposit);
  const invalidHereafter = validitySlotFor(funding.validUntil, chain);
  const executionEstimate = custodyExecutionEstimate({
    createAccount: 1,
    operate: 1,
    logic: 'arrival',
  });
  const largestFee = preEvaluationFeeBound(
    parameters,
    estimateWithinLimit(
      executionEstimate,
      parameters.maxExecutionUnitsPerTransaction,
    ),
  );
  const bounds: HeadroomBounds = {
    maxSponsoredLovelace: funding.maxSponsoredLovelace,
    deposit,
    fundable:
      funding.feeUtxo[1].value.coins -
      changeReserveAt(funding.sponsorAddress, parameters.coinsPerUtxoByte) -
      deposit -
      largestFee,
    minimum: controlLovelaceFor(
      { identity, state, floor: 0n },
      parameters.coinsPerUtxoByte,
    ),
  };

  const buildWith = async (
    controlLovelace: bigint,
  ): Promise<Serialization.Transaction> =>
    buildWithEvaluatedBudgets({
      chain,
      funds: { selected: [], remaining: [] },
      plan: () => ({
        inputs: [{ utxo: funding.feeUtxo }],
        referenceInputs: witnesses.referenced,
        outputs: [controlOutputOf(identity, state, controlLovelace + drawn)],
        changeAddress: funding.sponsorAddress,
        scripts: [...witnesses.attached, identity.stakeScript],
        executionEstimate,
        requiredSigner: key.keyHash,
        invalidHereafter,
        collateral: {
          utxo: funding.collateralUtxo,
          returnAddress: funding.sponsorAddress,
        },
        mint: {
          assets: new Map([[identity.stateNftAssetId, 1n]]),
          redeemer: encodeCustodyMintRedeemer({ kind: 'createAccount' }),
        },
        registration: {
          stakeCredential: scriptCredentialOf(identity.stakeScriptHash),
          deposit,
          redeemer: encodeCustodyStakeRedeemer(),
        },
        withdrawals: [logicRun.withdrawal],
      }),
    });

  // The control output takes what the sponsor's limit leaves. Its lovelace
  // above the state's minimum is the owner's fee reserve: an owner operation
  // the plain funds cannot pay takes its fee from it, so an account without
  // funds can still have devices changed and grants revoked. With Preprod's
  // 4,310 lovelace per byte, a 2 ADA deposit, the service's default limit of
  // 6 ADA and the proxy and logic referenced, a fee near 0.49 ADA leaves
  // about 3.41 ADA where the initial state needs 1.59 ADA. The creation
  // tests pin these numbers.
  let controlLovelace = headroomControlLovelace(bounds, largestFee);
  let transaction: Serialization.Transaction;
  for (let round = 1; ; round++) {
    transaction = await buildWith(controlLovelace);
    const fee = transaction.body().fee();
    const sponsoredLovelace = fee + deposit + controlLovelace;
    const isWithinLimit = sponsoredLovelace <= funding.maxSponsoredLovelace;
    const settled = headroomControlLovelace(bounds, fee);
    const isLastRound =
      round >= MAX_HEADROOM_ROUNDS || settled === controlLovelace;
    if (isWithinLimit && (settled < controlLovelace || isLastRound)) break;
    if (!isWithinLimit && isLastRound) {
      return failCustodyBuild({
        code: 'sponsor-limit',
        sponsoredLovelace,
        maxSponsoredLovelace: funding.maxSponsoredLovelace,
      });
    }
    controlLovelace = settled;
  }

  const record = createCustodyAccountRecord(identity);
  const result = finalizeCustodyBuild(
    {
      transaction,
      resolvedInputs: resolvedInputsOf(transaction, [
        funding.feeUtxo,
        ...witnesses.referenced,
        funding.collateralUtxo,
      ]),
    },
    chain,
    {
      record,
      control: { state, lovelace: controlLovelace + drawn },
      signer: key.keyHash,
      deviceKeyHash: key.keyHash,
      funding,
    },
  );
  return {
    ...result,
    creation: {
      creatorIndex: index,
      identity: {
        chainId: chain.chainId,
        accountValidatorHash: contractVersion.accountValidatorHash,
        creatorKeyHash: identity.creatorKeyHash,
        stakeScriptHash: identity.stakeScriptHash,
        address: identity.address,
        rewardAccount: identity.rewardAccount,
      },
    },
  };
};
