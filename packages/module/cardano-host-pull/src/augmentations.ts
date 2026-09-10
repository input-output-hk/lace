import type { cardanoHostPullReducers } from './store/slice';
import type { Cardano } from '@cardano-sdk/core';
import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';
import type {
  LaceMethodResult,
  LaceResult,
  SetActiveNetworkResult,
  WalletInfo,
} from '@lace-lib/extension-shell-api';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

/** The `cardano.getPendingTxs` payload, named so the side effect and its
 * dependency signature share one shape. */
export type PendingCardanoTxs = LaceMethodResult<'cardano.getPendingTxs'>;

/**
 * Guest-side side-effect dependencies this module injects for the wallet-repo
 * hydrator and the active-network write-back. All wrap a promise/event
 * platform API (or a feature-detect) at the dependency layer (ADR 19) so the
 * side effects are fully marble-testable.
 */
export interface CardanoHostPullDependencies {
  /** Reads the host vault's wallet list (wraps the `wallets.list` request). */
  listHostWallets: () => Observable<LaceResult<WalletInfo[]>>;
  /**
   * Emits when the guest surface regains user attention (window `focus` /
   * `document` visible again). The create/import/add-account ceremony runs in a
   * separate host-owned window (ADR 36); when it closes the user lands back on
   * the guest, so this is the pull model's (ADR 34) stand-in for the absent
   * completion push — it re-arms one bounded poll so a wallet that lands after
   * the boot/sync poll window has expired still appears without a full reload.
   */
  windowRefocus$: Observable<void>;
  /**
   * Whether the host advertised the `settings.setActiveNetwork` capability
   * (ADR 41 handshake), snapshotted at store init. False against an older host
   * → the active-network write-back side effect no-ops silently.
   */
  canSetActiveNetwork: boolean;
  /**
   * Record the guest's active Cardano network with the host (ADR 41
   * lace.settings), wrapping the `settings.setActiveNetwork` request as an
   * Observable (ADR 19). The host validates the dapp grant against it.
   */
  pushActiveCardanoNetwork: (
    networkMagic: number,
  ) => Observable<LaceResult<SetActiveNetworkResult>>;
  /**
   * Whether the host advertised the `cardano.getPendingTxs` capability (ADR 41
   * handshake), snapshotted at store init. False against an older host → the
   * pending-activity pull side effect no-ops silently.
   */
  canGetPendingCardanoTxs: boolean;
  /**
   * Read one account's live pending-tx entries from the host overlay, wrapping
   * the `cardano.getPendingTxs` request as an Observable (ADR 19).
   */
  getPendingCardanoTxs: (params: {
    walletId: string;
    accountIndex: number;
    networkMagic: number;
  }) => Observable<LaceResult<PendingCardanoTxs>>;
}

declare module '@lace-contract/cardano-context' {
  interface CardanoProviderConfig {
    blockfrostConfigs: Partial<Record<Cardano.NetworkMagic, BlockfrostConfig>>;
  }
}

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof cardanoHostPullReducers> {}

  interface SideEffectDependencies extends CardanoHostPullDependencies {}
}
