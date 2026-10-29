import { HexBlob } from '@cardano-sdk/util';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import { observeCardanoCustodyAccountState } from '../../src/custody/observe-cardano-custody-account-state';

import {
  agentGrantUtxo,
  controlOutput,
  createCustodyTestWallet,
  creatorBinding,
  DEVICE_1,
  fundUtxo,
  GRANT_LOVELACE,
  grantedControl,
  initialState,
  liveControl,
  record,
  utxo,
} from './custody-fixtures';

import type { Cardano } from '@cardano-sdk/core';
import type { CardanoCustodyDeviceBinding } from '@lace-contract/cardano-context';

const observeWith = async (
  utxos: Cardano.Utxo[],
  device: CardanoCustodyDeviceBinding = creatorBinding(),
) => {
  const test = createCustodyTestWallet();
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    device,
    name: 'Mine',
  });
  test.settledUtxos$.next({ [accountId]: utxos });
  return firstValueFrom(
    observeCardanoCustodyAccountState(test.wallet, accountId),
  );
};

describe('observeCardanoCustodyAccountState', () => {
  it('emits the account classification with its balance breakdown and listed device', async () => {
    const state = await observeWith([grantedControl, agentGrantUtxo, fundUtxo]);

    expect(state).toMatchObject({
      status: 'live',
      controlUtxo: grantedControl,
      // The fresh state's ledger minimum at Preprod's 4,310 per byte.
      controlMinimumLovelace: 1_586_080n,
      controlHeadroomLovelace: grantedControl[1].value.coins - 1_586_080n,
      funds: [fundUtxo],
      reserves: { own: [], foreign: [] },
      grants: [expect.objectContaining({ utxo: agentGrantUtxo })],
      grantLockedLovelace: GRANT_LOVELACE,
      stranded: [],
      anomalies: [],
      withdrawableRewards: 0n,
      currentDeviceListed: true,
    });
  });

  it("emits undefined while the protocol parameters of the account's network are unknown", async () => {
    const test = createCustodyTestWallet();
    test.networkInfo$.next({});
    const { accountId } = await openCardanoCustodyAccount(test.wallet, {
      record,
      device: creatorBinding(),
      name: 'Mine',
    });
    test.settledUtxos$.next({ [accountId]: [liveControl, fundUtxo] });

    await expect(
      firstValueFrom(observeCardanoCustodyAccountState(test.wallet, accountId)),
    ).resolves.toBeUndefined();
  });

  it('emits undefined for an id that names no custody account', async () => {
    const test = createCustodyTestWallet();

    await expect(
      firstValueFrom(
        observeCardanoCustodyAccountState(test.wallet, 'missing' as never),
      ),
    ).resolves.toBeUndefined();
  });

  describe('deposit address', () => {
    it('names the account address of a live account that lists this device', async () => {
      const state = await observeWith([liveControl, fundUtxo]);

      expect(state?.status === 'live' && state.depositAddress).toBe(
        record.address,
      );
    });

    it('names none before the control UTxO exists', async () => {
      const state = await observeWith([fundUtxo]);

      expect(state?.status).toBe('notCreated');
      expect(state).not.toHaveProperty('depositAddress');
    });

    it('names none for an invalid account', async () => {
      const state = await observeWith([
        liveControl,
        utxo(0x12, controlOutput(initialState)),
      ]);

      expect(state?.status).toBe('invalid');
      expect(state).not.toHaveProperty('depositAddress');
    });

    it('names none for an account under a logic the SDK does not accept, whose holdings still show', async () => {
      const logic = HexBlob(
        '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
      );

      const state = await observeWith([
        utxo(0x10, controlOutput({ ...initialState, logic })),
        fundUtxo,
      ]);

      expect(state).toMatchObject({
        status: 'invalid',
        reason: { code: 'unknown-logic', logic },
        funds: [fundUtxo],
      });
      expect(state).not.toHaveProperty('depositAddress');
    });

    it('names none when the state does not list this device', async () => {
      const state = await observeWith([liveControl], {
        ...creatorBinding(),
        index: 1,
        keyHash: DEVICE_1,
      });

      expect(state).toMatchObject({
        status: 'live',
        currentDeviceListed: false,
      });
      expect(state).not.toHaveProperty('depositAddress');
    });

    it('names none for an observer', async () => {
      const test = createCustodyTestWallet();
      const { accountId } = await openCardanoCustodyAccount(test.wallet, {
        record,
        name: 'Observed',
      });
      test.settledUtxos$.next({ [accountId]: [liveControl] });

      const state = await firstValueFrom(
        observeCardanoCustodyAccountState(test.wallet, accountId),
      );

      expect(state?.status).toBe('live');
      expect(state).not.toHaveProperty('depositAddress');
    });
  });
});
