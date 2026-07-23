import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  LOVELACE_TOKEN_ID,
  createInputResolver,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import {
  CardanoDustNetwork,
  CardanoPaymentKeyHash,
  CardanoStakeKeyHash,
  MidnightCoinPubkey,
  datumMatchesStakeKey,
  decodeDustMappingDatum,
  getCnightAssetId,
  getDustGeneratorPaymentAddress,
  getDustMappingNftAssetId,
  type NightDesignationAction as NightDesignationActionInput,
} from '@lace-lib/cnight-dust-designation';
import { BigNumber } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { exhaustMap, firstValueFrom, from, map, type Observable } from 'rxjs';

import { boundedExUnitsEvaluator } from './bounded-ex-units-evaluator';
import { buildNightDesignationTx } from './build-night-designation-tx';

import type { SideEffect } from '../..';
import type { ProviderError } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoPaymentAddress,
  NightDesignationBuildResult,
  NightDesignationStateBuilding,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';
import type { Result } from '@lace-lib/util';

// =====================================================================
// cNIGHT designation — build orchestrator.
// =====================================================================
// Drives the `Building` state: assembles the account context + Cardano
// network data, resolves the registration UTxO for update/deregister
// (scanning the script address + matching the account's stake key), runs
// `buildNightDesignationTx` against the SDK tx-builder, and reports the
// unsigned CBOR (or a typed error) via `buildCompleted`. `exhaustMap`
// drops re-entrant `Building` triggers while a build is in flight.
//
// All IO goes through injected dependencies (ADR 19) so it marble-tests.
// =====================================================================

// Added to the tip SLOT (1 slot = 1s on Cardano), so this is a ~2h TTL buffer.
const TTL_BUFFER_SLOTS = 7200;

// Map the typed build-failure codes to distinct, actionable copy; everything
// else (provider/network failures, missing chain id) falls back to the generic
// message. The user-facing codes come from the blueprint + resolveAction.
const BUILD_ERROR_KEYS_BY_CODE: Record<string, TxErrorTranslationKeys> = {
  'no-cnight': {
    title: 'v2.cnight-designation.build.error.no-cnight.title',
    subtitle: 'v2.cnight-designation.build.error.no-cnight.subtitle',
  },
  'no-cardano-utxos': {
    title: 'v2.cnight-designation.build.error.no-cardano-utxos.title',
    subtitle: 'v2.cnight-designation.build.error.no-cardano-utxos.subtitle',
  },
  'no-registration-utxo': {
    title: 'v2.cnight-designation.build.error.no-registration-utxo.title',
    subtitle: 'v2.cnight-designation.build.error.no-registration-utxo.subtitle',
  },
};

const GENERIC_BUILD_ERROR_KEYS: TxErrorTranslationKeys = {
  title: 'v2.cnight-designation.build.error.title',
  subtitle: 'v2.cnight-designation.build.error.subtitle',
};

const errorTranslationKeysForCode = (
  code: string | undefined,
): TxErrorTranslationKeys =>
  (code ? BUILD_ERROR_KEYS_BY_CODE[code] : undefined) ??
  GENERIC_BUILD_ERROR_KEYS;

const failure = (error: Error, code?: string): NightDesignationBuildResult => ({
  success: false,
  error: { name: error.name, message: error.message },
  errorTranslationKeys: errorTranslationKeysForCode(code),
});

const hexToBytes = (hex: string): Uint8Array => {
  // Fail fast on malformed hex rather than silently coercing non-hex / odd-length
  // input to wrong bytes (`parseInt` → NaN → 0). This feeds key-hash construction
  // and tx building, so a bad value must not produce an unintended signed tx.
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error(`Invalid hex string: "${hex}"`);
  }
  return Uint8Array.from(
    (hex.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16)),
  );
};

const unwrap = async <T>(
  observable: Observable<Result<T, ProviderError>>,
): Promise<T> => {
  const result = await firstValueFrom(observable);
  if (!result.isOk()) {
    throw result.error instanceof Error
      ? result.error
      : new Error(String(result.error));
  }
  return result.value;
};

/**
 * Resolve the rich cNIGHT action from the serializable `Building` state.
 * For update/deregister this scans the script address for the registration
 * UTxO whose inline datum is bound to the account's stake key.
 */
const resolveAction = async ({
  state,
  network,
  stakeKeyHash,
  dependencies,
  chainId,
}: {
  state: NightDesignationStateBuilding;
  network: CardanoDustNetwork;
  stakeKeyHash: CardanoStakeKeyHash;
  dependencies: SideEffectDependencies;
  chainId: Cardano.ChainId;
}): Promise<NightDesignationActionInput> => {
  const dustPubkey =
    state.dustPubkeyHex === undefined
      ? undefined
      : MidnightCoinPubkey(hexToBytes(state.dustPubkeyHex));

  if (state.action === 'designate') {
    if (!dustPubkey) throw new Error('Missing dust pubkey for designate');
    return { kind: 'register', dustPubkey };
  }

  const scriptAddress = getDustGeneratorPaymentAddress(
    network,
  ) as unknown as CardanoPaymentAddress;
  const scriptUtxos = await unwrap(
    dependencies.cardanoProvider.getUtxosAtAddress(
      { address: scriptAddress },
      { chainId },
    ),
  );
  const nftAssetId = getDustMappingNftAssetId(network);
  const registrationUtxo = scriptUtxos.find(([, out]) => {
    if (out.value.assets?.get(nftAssetId) !== 1n) return false;
    if (!out.datum) return false;
    const datum = decodeDustMappingDatum(
      Serialization.PlutusData.fromCore(out.datum).toCbor(),
    );
    return datum ? datumMatchesStakeKey(datum, stakeKeyHash) : false;
  });
  if (!registrationUtxo) {
    throw Object.assign(
      new Error('No cNIGHT designation registration found for this account'),
      { code: 'no-registration-utxo' as const },
    );
  }

  if (state.action === 'deregister') {
    return { kind: 'deregister', registrationUtxo };
  }
  if (!dustPubkey) throw new Error('Missing dust pubkey for update');
  // Fail fast rather than defaulting a missing amount to 0: a silent `0` would
  // build an update that leaves the accrued script rewards behind. `'0'` is a
  // legitimate value (nothing accrued) and is allowed; only an absent field —
  // which means the caller never computed it — is an error.
  if (state.scriptWithdrawableLovelace === undefined) {
    throw new Error('Missing script withdrawable amount for update');
  }
  return {
    kind: 'update',
    dustPubkey,
    registrationUtxo,
    scriptWithdrawableLovelace: BigInt(state.scriptWithdrawableLovelace),
  };
};

const buildDesignation = async (
  state: NightDesignationStateBuilding,
  dependencies: SideEffectDependencies,
): Promise<NightDesignationBuildResult> => {
  try {
    const { accountId } = state;
    const cardano = dependencies.txExecutorCardano;

    const [chainId, allAccountUtxos, unspendableUtxos, cardanoAddresses] =
      await Promise.all([
        firstValueFrom(cardano.cardanoChainId$),
        firstValueFrom(cardano.cardanoAccountUtxos$),
        firstValueFrom(cardano.cardanoAccountUnspendableUtxos$),
        firstValueFrom(cardano.cardanoAddresses$),
      ]);

    if (!chainId) throw new Error('Cardano chain id not available');

    // FULL protocol parameters (incl. V3 cost models) — not the cached
    // RequiredProtocolParameters pick on cardanoProtocolParameters$.
    const [protocolParameters, tip] = await Promise.all([
      unwrap(dependencies.cardanoProvider.getProtocolParameters({ chainId })),
      unwrap(dependencies.cardanoProvider.getTip({ chainId })),
    ]);

    const network = CardanoDustNetwork.fromNetworkMagic(chainId.networkMagic);

    const accountAddresses: AnyAddress[] = cardanoAddresses.filter(
      (addr): addr is AnyAddress =>
        addr.accountId === accountId && addr.blockchainName === 'Cardano',
    );
    const primary = accountAddresses[0];
    if (!primary) throw new Error('No Cardano addresses found for account');

    const baseAddress = Cardano.Address.fromString(
      primary.address as string,
    )?.asBase();
    if (!baseAddress) {
      throw new Error('Account address is not a base (payment+stake) address');
    }
    const paymentKeyHash = CardanoPaymentKeyHash(
      hexToBytes(baseAddress.getPaymentCredential().hash),
    );
    const stakeKeyHash = CardanoStakeKeyHash(
      hexToBytes(baseAddress.getStakeCredential().hash),
    );

    const spendable = filterSpendableUtxos(
      allAccountUtxos[accountId] ?? [],
      unspendableUtxos[accountId] ?? [],
    );
    const cnightAssetId = getCnightAssetId(network);
    const cnightUtxos = spendable.filter(([, out]) =>
      out.value.assets?.has(cnightAssetId),
    );
    // ADA cover + collateral pool: spendable, non-cNIGHT UTxOs.
    const coverUtxos = spendable.filter(
      ([, out]) => !out.value.assets?.has(cnightAssetId),
    );

    // No ADA-only UTxO to fund the fee + collateral (e.g. every spendable
    // UTxO holds cNIGHT) → surface the actionable "not enough ADA" copy
    // instead of a generic balancing failure deep in the SDK builder.
    if (coverUtxos.length === 0) {
      return failure(
        new Error('No ADA-only UTxO available to cover fee and collateral'),
        'no-cardano-utxos',
      );
    }

    const action = await resolveAction({
      state,
      network,
      stakeKeyHash,
      dependencies,
      chainId,
    });

    const result = await buildNightDesignationTx(
      {
        network,
        action,
        cnightUtxos,
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: Cardano.PaymentAddress(primary.address as string),
        ttlSlot: Cardano.Slot(Number(tip.slot) + TTL_BUFFER_SLOTS),
        protocolParameters,
      },
      {
        networkMagic: chainId.networkMagic as Cardano.NetworkMagics,
        coverUtxos,
        txEvaluator: boundedExUnitsEvaluator,
        inputResolver: createInputResolver([
          ...cnightUtxos,
          ...coverUtxos,
          ...(action.kind === 'register' ? [] : [action.registrationUtxo]),
        ]),
      },
    );

    if (!result.ok)
      return failure(new Error(result.error.message), result.error.code);
    return {
      success: true,
      serializedTx: result.value.cbor,
      fees: [
        { tokenId: LOVELACE_TOKEN_ID, amount: BigNumber(result.value.fee) },
      ],
    };
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error(String(error)),
      (error as { code?: string }).code,
    );
  }
};

export const makeNightDesignationBuilding =
  (): SideEffect => (_, stateObservables, dependencies) =>
    firstStateOfStatus(
      stateObservables.nightDesignationFlow.selectState$,
      'Building',
    ).pipe(
      exhaustMap(state =>
        from(buildDesignation(state, dependencies)).pipe(
          map(result =>
            dependencies.actions.nightDesignationFlow.buildCompleted({
              result,
            }),
          ),
        ),
      ),
    );
