import { of } from 'rxjs';

import type { SideEffect } from '../../../src';
import type { buildCardanoAddressRecord } from '../../support/cardano-account';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';

type StateObservables = Parameters<SideEffect>[1];
type AddressRecord = ReturnType<typeof buildCardanoAddressRecord>;

type StateObservablesInput = {
  walletId: WalletId;
  sourceAccountId: AccountId;
  destinationAccountId: AccountId;
  destinationRecord: AddressRecord;
};

/**
 * State the side-effects still read once the source context is injected: the
 * wizard ids and the destination address record. The source context is supplied
 * separately through the injected resolveSourceContext, not through state. Cast
 * to the full whole-app parameter type where it is injected (as the module's
 * unit test does).
 */
export const buildStateObservables = ({
  walletId,
  sourceAccountId,
  destinationAccountId,
  destinationRecord,
}: StateObservablesInput): StateObservables =>
  ({
    migrateWallet: {
      selectSourceWalletId$: of(walletId),
      selectSourceAccountId$: of(sourceAccountId),
      selectDestinationAccountId$: of(destinationAccountId),
      // Legacy (pre-mapping) runs: no mode, no plan — the sweep keeps the
      // picked account and the single sweep-wide target.
      selectDestinationWalletId$: of(undefined),
      selectSweepProgress$: of(undefined),
      selectMigrationMode$: of(undefined),
      selectAccountMapping$: of(undefined),
      selectPendingHwDestinationDevice$: of(undefined),
    },
    wallets: { selectAll$: of([]) },
    addresses: {
      selectByAccountId$: of((accountId: AccountId) =>
        accountId === destinationAccountId ? [destinationRecord] : [],
      ),
    },
  } as unknown as StateObservables);
