import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom, Subject, toArray, take } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { observeCardanoCustodyGrantStatuses } from '../../src/custody/observe-cardano-custody-grant-statuses';

import { agentGrant, agentGrantUtxo, record } from './custody-fixtures';

import type { WalletWithCardanoCustody } from '../../src/custody/cardano-custody-wallet';
import type { CardanoCustodyGrantWithStatus } from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';

const ACCOUNT = 'custody-account' as AccountId;
const OTHER = 'other-account' as AccountId;

type StatusesOf = (
  accountId: AccountId,
) => CardanoCustodyGrantWithStatus[] | undefined;

const walletWith = (statuses$: Subject<StatusesOf>) =>
  ({
    stateObservables: {
      cardanoCustody: { selectCardanoCustodyGrantStatuses$: statuses$ },
    },
  } as unknown as Pick<WalletWithCardanoCustody, 'stateObservables'>);

describe('observeCardanoCustodyGrantStatuses', () => {
  it("emits the account's grant statuses, once per change", async () => {
    const statuses$ = new Subject<StatusesOf>();
    const held = {
      utxo: agentGrantUtxo,
      grant: agentGrant,
      token: Cardano.AssetId(
        `${record.accountValidatorHash}${record.stakeScriptHash}00000000`,
      ),
    };
    const live = [{ ...held, status: 'live' as const }];
    const expired = [{ ...held, status: 'expired' as const }];
    const emitted = firstValueFrom(
      observeCardanoCustodyGrantStatuses(walletWith(statuses$), ACCOUNT).pipe(
        take(2),
        toArray(),
      ),
    );

    statuses$.next(id => (id === ACCOUNT ? live : undefined));
    // Another account changed; this one did not.
    statuses$.next(id => (id === ACCOUNT ? live : []));
    statuses$.next(id => (id === ACCOUNT ? expired : undefined));

    await expect(emitted).resolves.toEqual([live, expired]);
  });

  it('emits undefined for an id the selector knows nothing of', async () => {
    const statuses$ = new Subject<StatusesOf>();
    const emitted = firstValueFrom(
      observeCardanoCustodyGrantStatuses(walletWith(statuses$), OTHER),
    );

    statuses$.next(id => (id === ACCOUNT ? [] : undefined));

    await expect(emitted).resolves.toBeUndefined();
  });
});
