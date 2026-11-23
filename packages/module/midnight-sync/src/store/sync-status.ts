import { Percent } from '@cardano-sdk/util';
import {
  combineLatest,
  connect,
  defer,
  distinctUntilChanged,
  endWith,
  ignoreElements,
  map,
  merge,
  of,
  switchMap,
  takeUntil,
  throttleTime,
} from 'rxjs';

import type { TranslationKey } from '@lace-contract/i18n';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';

type Progress = MidnightWallet['syncProgress$'] extends Observable<infer T>
  ? T
  : never;

const healthDetails: Partial<
  Record<NonNullable<Progress['indexerLiveness']>, TranslationKey>
> = {
  Ahead: 'v2.sync-status.detail.indexer-ahead',
  Behind: 'v2.sync-status.detail.indexer-behind',
  Unknown: 'v2.sync-status.detail.checking-chain',
  Unavailable: 'v2.sync-status.detail.check-failed',
  WrongNetwork: 'v2.sync-status.detail.chain-mismatch',
};

type Component = keyof Progress['isStrictlyComplete'];
const allComponents = ['shielded', 'dust', 'unshielded'] as const;

const deriveSyncStatus = (
  snapshot: Progress,
  unshieldedEnabled: boolean,
  previouslyConnectedComponents: ReadonlySet<Component>,
) => {
  const components = unshieldedEnabled
    ? (['shielded', 'dust', 'unshielded'] as const)
    : (['shielded', 'dust'] as const);
  const liveness = snapshot.indexerLiveness ?? 'Skipped';
  const isConnected = components.every(
    component => snapshot.isConnected?.[component] !== false,
  );
  const hasDisconnected = components.some(
    component =>
      snapshot.isConnected?.[component] === false &&
      previouslyConnectedComponents.has(component),
  );
  const canReportSyncProgress =
    isConnected && (liveness === 'InSync' || liveness === 'Skipped');
  const isComplete =
    canReportSyncProgress &&
    components.every(component => snapshot.isStrictlyComplete[component]);
  const ratios = components.map(component => snapshot[component]);
  const progress = isComplete
    ? Percent(1)
    : canReportSyncProgress &&
      ratios.every((ratio): ratio is Percent => ratio !== undefined)
    ? Percent(Math.min(...ratios))
    : undefined;

  const statusDetail: TranslationKey | undefined = isComplete
    ? undefined
    : healthDetails[liveness] ??
      (hasDisconnected
        ? 'v2.sync-status.detail.disconnected'
        : !isConnected
        ? 'v2.sync-status.detail.waiting-for-data'
        : progress === undefined
        ? 'v2.sync-status.detail.waiting-for-target'
        : undefined);

  return { progress, isComplete, isConnected, liveness, statusDetail };
};

type SyncStatus = ReturnType<typeof deriveSyncStatus>;

const sameControlState = (left: SyncStatus, right: SyncStatus) =>
  left.statusDetail === right.statusDetail &&
  left.isComplete === right.isComplete &&
  left.isConnected === right.isConnected &&
  left.liveness === right.liveness &&
  (left.progress === undefined) === (right.progress === undefined);

const displayedPercent = ({ progress, isComplete, liveness }: SyncStatus) =>
  progress === undefined || liveness === 'WrongNetwork'
    ? undefined
    : isComplete
    ? 100
    : Math.min(99, Math.floor(progress * 100));

const sameVisibleState = (left: SyncStatus, right: SyncStatus) =>
  sameControlState(left, right) &&
  displayedPercent(left) === displayedPercent(right);

/** Keep Redux work bounded without delaying a change in completion or health. */
export const observeSyncStatus = (
  progress$: MidnightWallet['syncProgress$'],
  unshieldedEnabled$: Observable<boolean>,
) =>
  defer(() => {
    const previouslyConnectedComponents = new Set<Component>();
    let protocolVersions: Progress['protocolVersions'];

    return progress$.pipe(
      map(snapshot => {
        for (const component of allComponents) {
          // A protocol handover starts a new sync stream for this component.
          if (
            protocolVersions?.[component] !==
            snapshot.protocolVersions?.[component]
          )
            previouslyConnectedComponents.delete(component);
          if (snapshot.isConnected?.[component] === true)
            previouslyConnectedComponents.add(component);
        }
        protocolVersions = snapshot.protocolVersions;
        // False before the first applied update is not evidence of connection loss.
        return {
          snapshot,
          previouslyConnectedComponents: new Set(previouslyConnectedComponents),
        };
      }),
      connect(sharedProgress$ =>
        combineLatest([
          sharedProgress$,
          unshieldedEnabled$.pipe(
            // Feature changes cannot revive a wallet whose progress source ended.
            takeUntil(
              sharedProgress$.pipe(ignoreElements(), endWith(undefined)),
            ),
          ),
        ]),
      ),
      map(([{ snapshot, previouslyConnectedComponents }, isEnabled]) =>
        deriveSyncStatus(snapshot, isEnabled, previouslyConnectedComponents),
      ),
      distinctUntilChanged(sameVisibleState),
      connect(snapshots$ =>
        snapshots$.pipe(
          distinctUntilChanged(sameControlState),
          // A control transition starts a new window and cancels the old trailing
          // snapshot. Delayed percentage work must never restore outdated health.
          switchMap(first =>
            merge(of(first), snapshots$).pipe(
              throttleTime(500, undefined, { leading: true, trailing: true }),
            ),
          ),
        ),
      ),
      // Progress can move away and back within a window. Do not redispatch the
      // same displayed value just because an intermediate value was suppressed.
      distinctUntilChanged(sameVisibleState),
    );
  });
