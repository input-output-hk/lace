import { cardanoNetworkMagicToNetworkType } from '@lace-contract/cardano-context';
import { Serializable } from '@lace-lib/util-store';
import { of } from 'rxjs';

import {
  makeRunDiscovery,
  makeRunSweep,
} from '../../../src/store/side-effects';
import { migrateWalletActions } from '../../../src/store/slice';

import { buildFlowInputs } from './inputs';

import type { ReviewedSweepPlan } from '../../../src/store/side-effects';
import type { SourceContextResolver } from '../../../src/store/side-effects';
import type { DerivedAccount } from '../../cardano/account';
import type { Providers } from '../../cardano/queries';

const mw = migrateWalletActions.migrateWallet;

/**
 * The terminal outcome of a headless migration run: a successful sweep with its
 * txId, or a refusal (`unsupported`) reported by discovery so the caller can
 * assert on it. A genuine failure (discovery or sweep) rejects the run loudly
 * rather than resolving, so a broken migration surfaces as a hard error, not a
 * hang. Refusal and failure are distinct: a refusal is the production
 * `migrationUnsupported` action, a failure is `stepFailed`.
 */
export type MigrationOutcome =
  | { kind: 'swept'; txId: string }
  | { kind: 'unsupported'; errorKey: string };

/**
 * Runs the real migrate-wallet flow headlessly: drives makeRunDiscovery and
 * makeRunSweep with the source context injected and state seeded from live
 * provider reads. buildSweepTx and the submit are real, and signing routes
 * through the production signer. Resolves with the terminal outcome.
 */
export const runMigrationFlow = async ({
  source,
  destination,
  providers,
}: {
  source: DerivedAccount;
  destination: DerivedAccount;
  providers: Providers;
}): Promise<MigrationOutcome> => {
  const {
    actionObservables,
    stateObservables,
    dependencies,
    triggers,
    resolveSourceContext,
    sourceWalletId,
    sourceAccountId,
    wallet,
  } = await buildFlowInputs({ source, destination, providers });

  const discovery$ = makeRunDiscovery({ resolveSourceContext })(
    actionObservables,
    stateObservables,
    dependencies,
  );
  // The sweep replays the exact set discovery reviewed (the store has no reducer
  // here, so capture the reviewed plan off the discoveryCompleted action and feed
  // it back). This is how a multi-account sweep gets accounts 1+, which the
  // account-0 resolveSourceContext could not supply.
  let reviewedPlan: ReviewedSweepPlan | undefined;
  const resolveReviewedPlan: SourceContextResolver = () => {
    if (!reviewedPlan)
      throw new Error('sweep started before discovery reviewed');
    return of({ ...reviewedPlan, wallet });
  };
  const sweep$ = makeRunSweep({ resolveSourceContext: resolveReviewedPlan })(
    actionObservables,
    stateObservables,
    dependencies,
  );

  return new Promise<MigrationOutcome>((resolve, reject) => {
    // A failure arrives as a stepFailed action (a next emission from failure(),
    // not a stream error), so match it and reject loudly with the phase instead
    // of dropping it and hanging. A refusal is the distinct migrationUnsupported
    // action, which resolves to `unsupported` so the caller can assert on it.
    // The match narrows the action, so its errorKey is present with no cast.
    const rejectFailed = (
      phase: string,
      action: ReturnType<typeof mw.stepFailed>,
    ): void => {
      reject(new Error(`${phase} failed: ${action.payload.errorKey}`));
    };

    sweep$.subscribe({
      next: action => {
        if (mw.sweepSucceeded.match(action)) {
          resolve({ kind: 'swept', txId: action.payload.txId });
        } else if (mw.stepFailed.match(action)) {
          rejectFailed('sweep', action);
        }
      },
      error: reject,
    });
    discovery$.subscribe({
      next: action => {
        if (mw.discoveryCompleted.match(action)) {
          console.log('  discoveryCompleted, starting sweep');
          reviewedPlan = Serializable.from<ReviewedSweepPlan>(
            action.payload.reviewedPlan as Serializable<ReviewedSweepPlan>,
          );
          triggers.sweepStarted$.next(mw.sweepStarted());
        } else if (mw.migrationUnsupported.match(action)) {
          resolve({ kind: 'unsupported', errorKey: action.payload.errorKey });
        } else if (mw.stepFailed.match(action)) {
          rejectFailed('discovery', action);
        }
      },
      error: reject,
    });

    // The triggers are hot Subjects: both streams above must already be
    // subscribed before the first emission, so sourceImported$ fires last.
    triggers.sourceImported$.next(
      mw.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: cardanoNetworkMagicToNetworkType(
          source.chainId.networkMagic,
        ),
      }),
    );
  });
};
