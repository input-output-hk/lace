import { Cardano } from '@cardano-sdk/core';
import { isRetriableError } from '@lace-lib/util-provider';
import { firstValueFrom } from 'rxjs';

import { unwrapProviderResult } from '../night-designation/unwrap-provider-result';

import { failCustodyBuild, messageOf } from './build-failure';

import type {
  EraSummary,
  ProviderError,
  Serialization,
} from '@cardano-sdk/core';
import type {
  CardanoProvider,
  RedeemerExecutionUnits,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';
import type { Observable } from 'rxjs';

/** Converts between POSIX milliseconds and slots on one network. */
interface SlotClock {
  /** The slot whose interval holds the instant. */
  readonly slotAt: (posixMs: number) => Cardano.Slot;
  /** The instant a slot starts at: what a script sees as a validity bound. */
  readonly slotStart: (slot: Cardano.Slot) => number;
}

/** What every custody build reads from the chain before it builds. */
export interface CustodyChain {
  readonly chainId: Cardano.ChainId;
  /** The full parameters, with cost models and execution limits. */
  readonly protocolParameters: Cardano.ProtocolParameters;
  readonly clock: SlotClock;
  /** POSIX milliseconds the build treats as the present. */
  readonly now: number;
  readonly provider: CardanoProvider;
}

/**
 * The slot clock of the era history. A time or slot before the first era
 * is read in the first era: custody transactions only name slots near the
 * present.
 */
export const createSlotClock = (
  eraSummaries: readonly EraSummary[],
): SlotClock => {
  const eraOf = (isStarted: (era: EraSummary) => boolean): EraSummary =>
    eraSummaries.filter(isStarted).at(-1) ?? eraSummaries[0];
  return {
    slotAt: posixMs => {
      const era = eraOf(({ start }) => start.time.getTime() <= posixMs);
      return Cardano.Slot(
        era.start.slot +
          Math.floor(
            (posixMs - era.start.time.getTime()) / era.parameters.slotLength,
          ),
      );
    },
    slotStart: slot => {
      const era = eraOf(({ start }) => start.slot <= slot);
      return (
        era.start.time.getTime() +
        (slot - era.start.slot) * era.parameters.slotLength
      );
    },
  };
};

/**
 * One provider read, retried while transient. A failure stops the build as
 * `unavailable`, since nothing about the custody account is known yet.
 */
export const readFromProvider = async <T>(
  what: string,
  request: () => Observable<Result<T, ProviderError>>,
): Promise<T> => {
  try {
    return await firstValueFrom(unwrapProviderResult(request));
  } catch (error) {
    return failCustodyBuild({
      code: 'unavailable',
      message: `${what}: ${messageOf(error)}`,
    });
  }
};

export const loadCustodyChain = async ({
  chainId,
  eraSummaries,
  provider,
  now,
}: {
  chainId: Cardano.ChainId | undefined;
  eraSummaries: EraSummary[] | undefined;
  provider: CardanoProvider;
  now: number;
}): Promise<CustodyChain> => {
  if (!chainId) {
    return failCustodyBuild({
      code: 'unavailable',
      message: 'Cardano chain id not available',
    });
  }
  if (!eraSummaries || eraSummaries.length === 0) {
    return failCustodyBuild({
      code: 'unavailable',
      message: 'Cardano era summaries not available',
    });
  }
  // Full parameters, not the persisted pick: Plutus builds need the cost
  // models and the execution limits, which the pick leaves out.
  const protocolParameters = await readFromProvider(
    'Cardano protocol parameters',
    () => provider.getProtocolParameters({ chainId }),
  );
  return {
    chainId,
    protocolParameters,
    clock: createSlotClock(eraSummaries),
    now,
    provider,
  };
};

/**
 * What the provider measures every redeemer of a transaction at. There is
 * no fallback budget: a script that fails is a build that fails, with the
 * provider's message. A transient failure, such as a rate limit or a
 * dropped connection, is retried like every other read and then reported
 * as `unavailable`, since it says nothing about the scripts.
 */
export const evaluateCustodyTransaction = async (
  transaction: Serialization.Transaction,
  { provider, chainId }: CustodyChain,
): Promise<RedeemerExecutionUnits[]> => {
  const tx = transaction.toCbor();
  try {
    return await firstValueFrom(
      unwrapProviderResult(() => provider.evaluateTx({ tx }, { chainId })),
    );
  } catch (error) {
    return failCustodyBuild(
      isRetriableError(error)
        ? {
            code: 'unavailable',
            message: `Transaction evaluation: ${messageOf(error)}`,
          }
        : { code: 'script-evaluation-failed', message: messageOf(error) },
    );
  }
};

/**
 * The first slot that starts strictly after `posixMs`. A sweep of a grant
 * dead by expiry alone sets it as the lower validity bound, because the
 * validator needs the start of that bound to be after the expiry.
 */
export const firstSlotStartingAfter = (
  posixMs: bigint,
  { clock }: Pick<CustodyChain, 'clock'>,
): Cardano.Slot => Cardano.Slot(clock.slotAt(Number(posixMs)) + 1);

/**
 * The upper validity bound a funding window allows: the slot holding
 * `validUntil`, which starts no later than it. The window must leave a slot
 * after the current one.
 */
export const validitySlotFor = (
  validUntil: number,
  { clock, now }: CustodyChain,
): Cardano.Slot => {
  const slot = Number.isFinite(validUntil) ? clock.slotAt(validUntil) : 0;
  return slot > clock.slotAt(now)
    ? Cardano.Slot(slot)
    : failCustodyBuild({ code: 'validity-window', validUntil });
};
