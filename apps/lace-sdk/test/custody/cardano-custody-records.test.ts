import { Cardano } from '@cardano-sdk/core';
import {
  CardanoAccountId,
  CardanoCustodyDeviceKeyMismatchError,
  CardanoCustodyWalletId,
  CardanoNetworkId,
  derivePendingActivityFromCbor,
} from '@lace-contract/cardano-context';
import { WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createCardanoCustodyAccountEntity,
  openCardanoCustodyAccount,
} from '../../src/custody/cardano-custody-account-entity';
import {
  CardanoCustodyInvalidOperationError,
  CardanoCustodyNetworkNotReadyError,
  CardanoCustodyRecordInvalidError,
  CardanoCustodyUnsupportedVersionError,
} from '../../src/custody/cardano-custody-errors';
import {
  exportCardanoCustodyAccountRecord,
  exportCardanoCustodyAgentPolicy,
  parseCardanoCustodyAccountRecord,
} from '../../src/custody/cardano-custody-records';

import {
  agentGrant,
  agentGrantUtxo,
  controlOutput,
  createCustodyTestWallet,
  creatorBinding,
  DEVICE_1,
  grantedControl,
  grantedState,
  grantUtxo,
  identity,
  issueGrantShape,
  liveControl,
  localChannel,
  PREPROD,
  record,
  revokedState,
  transactionOf,
  utxo,
} from './custody-fixtures';

import type { AccountId } from '@lace-contract/wallet-repo';

const PREPROD_MAGIC = Cardano.NetworkMagics.Preprod;
const walletId = CardanoCustodyWalletId.derive(
  PREPROD_MAGIC,
  identity.stakeScriptHash,
);
const accountId = CardanoAccountId(walletId, 0, PREPROD_MAGIC) as AccountId;

describe('parseCardanoCustodyAccountRecord', () => {
  it('accepts the record as JSON text and returns its canonical form', () => {
    expect(
      parseCardanoCustodyAccountRecord(JSON.stringify(record), {
        networkMagic: PREPROD_MAGIC,
      }),
    ).toEqual(record);
  });

  it('accepts the upstream record shape on the selected network', () => {
    expect(
      parseCardanoCustodyAccountRecord(
        {
          owner: record.creatorKeyHash,
          stakeScriptHash: record.stakeScriptHash,
          address: record.address,
        },
        { networkMagic: PREPROD_MAGIC },
      ),
    ).toEqual(record);
  });

  it.each([
    ['a malformed record', { ...record, version: 2 }, 1],
    [
      'a stake script hash its creator does not yield',
      { ...record, stakeScriptHash: 'ab'.repeat(28) },
      3,
    ],
    [
      'an address other than the derived one',
      { ...record, networkMagic: Cardano.NetworkMagics.Mainnet },
      4,
    ],
    [
      'another testnet',
      { ...record, networkMagic: Cardano.NetworkMagics.Preview },
      5,
    ],
  ])('refuses %s', (_, input, step) => {
    let refusal: unknown;
    try {
      parseCardanoCustodyAccountRecord(input, { networkMagic: PREPROD_MAGIC });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(CardanoCustodyRecordInvalidError);
    expect((refusal as CardanoCustodyRecordInvalidError).reason.step).toBe(
      step,
    );
  });

  it('refuses an unsupported contract version with its own error', () => {
    expect(() =>
      parseCardanoCustodyAccountRecord(
        { ...record, accountValidatorHash: 'cd'.repeat(28) },
        { networkMagic: PREPROD_MAGIC },
      ),
    ).toThrow(CardanoCustodyUnsupportedVersionError);
  });
});

describe('createCardanoCustodyAccountEntity', () => {
  it('builds the custody wallet of the record on the wallet network', async () => {
    const { wallet } = createCustodyTestWallet();
    const device = creatorBinding();

    const { entity } = await createCardanoCustodyAccountEntity(wallet, {
      record,
      device,
      name: 'Agent treasury',
    });

    expect(entity).toEqual({
      type: WalletType.CardanoCustody,
      walletId,
      metadata: { name: 'Agent treasury', order: 0 },
      blockchainSpecific: {},
      accounts: [
        {
          accountId,
          walletId,
          accountType: 'CardanoCustody',
          blockchainName: 'Cardano',
          blockchainNetworkId: CardanoNetworkId(PREPROD_MAGIC),
          networkType: 'testnet',
          metadata: { name: 'Agent treasury' },
          blockchainSpecific: {
            chainId: PREPROD,
            networkId: CardanoNetworkId(PREPROD_MAGIC),
            accountValidatorHash: record.accountValidatorHash,
            creatorKeyHash: record.creatorKeyHash,
            stakeScriptHash: record.stakeScriptHash,
            address: record.address,
            rewardAccount: identity.rewardAccount,
            device,
          },
        },
      ],
    });
  });

  it('opens an observer without a device binding', async () => {
    const { wallet } = createCustodyTestWallet();

    const { entity } = await createCardanoCustodyAccountEntity(wallet, {
      record,
      name: 'Observed',
    });

    expect(entity.accounts[0].blockchainSpecific).not.toHaveProperty('device');
  });

  it('refuses a device binding whose key hash its public key does not derive', async () => {
    const { wallet } = createCustodyTestWallet();

    await expect(
      createCardanoCustodyAccountEntity(wallet, {
        record,
        device: { ...creatorBinding(), keyHash: DEVICE_1 },
        name: 'x',
      }),
    ).rejects.toBeInstanceOf(CardanoCustodyDeviceKeyMismatchError);
  });

  it('refuses a record of another network than the wallet', async () => {
    const { wallet, chainId$ } = createCustodyTestWallet();
    chainId$.next(Cardano.ChainIds.Preview);

    await expect(
      createCardanoCustodyAccountEntity(wallet, { record, name: 'x' }),
    ).rejects.toBeInstanceOf(CardanoCustodyRecordInvalidError);
  });

  describe('right after wallet creation', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('waits for the wallet to select its network', async () => {
      const { wallet, chainId$, custodyAccount } = createCustodyTestWallet();
      chainId$.next(undefined);
      const opened = vi.fn();

      const opening = openCardanoCustodyAccount(wallet, {
        record,
        name: 'x',
      }).then(opened);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(opened).not.toHaveBeenCalled();
      chainId$.next(PREPROD);
      await opening;

      expect(custodyAccount(accountId)).toBeDefined();
    });

    it('reports a failure of the network state as it is', async () => {
      const { wallet, chainId$ } = createCustodyTestWallet();
      const failure = new Error('store torn down');
      chainId$.error(failure);

      await expect(
        createCardanoCustodyAccountEntity(wallet, { record, name: 'x' }),
      ).rejects.toBe(failure);
    });

    it('refuses once no network is selected within 30 seconds', async () => {
      vi.useFakeTimers();
      const { wallet, chainId$ } = createCustodyTestWallet();
      chainId$.next(undefined);

      const creating = createCardanoCustodyAccountEntity(wallet, {
        record,
        name: 'x',
      });
      const refused = expect(creating).rejects.toEqual(
        new CardanoCustodyNetworkNotReadyError(30_000),
      );
      await vi.advanceTimersByTimeAsync(30_000);

      await refused;
    });
  });
});

describe('openCardanoCustodyAccount', () => {
  it('adds the account the wallet does not hold', async () => {
    const { wallet, dispatch, custodyAccount } = createCustodyTestWallet();

    const opened = await openCardanoCustodyAccount(wallet, {
      record,
      name: 'Observed',
    });

    expect(opened.accountId).toBe(accountId);
    expect(dispatch).toHaveBeenCalledWith('wallets.addWallet', opened.entity);
    expect(custodyAccount(accountId)).toBeDefined();
  });

  it('switches the device of an account the wallet holds in place, keeping its name', async () => {
    const { wallet, dispatch, custodyAccount } = createCustodyTestWallet();
    await openCardanoCustodyAccount(wallet, { record, name: 'Observed' });
    dispatch.mockClear();

    await openCardanoCustodyAccount(wallet, {
      record,
      device: creatorBinding(localChannel),
      name: 'Renamed',
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      'wallets.addWallet',
      expect.anything(),
    );
    expect(dispatch).toHaveBeenCalledWith(
      'wallets.updateAccount',
      walletId,
      accountId,
      expect.anything(),
    );
    expect(custodyAccount(accountId)).toMatchObject({
      metadata: { name: 'Observed' },
      blockchainSpecific: { device: creatorBinding(localChannel) },
    });
  });

  it('turns an account into an observer when reopened without a device', async () => {
    const { wallet, custodyAccount } = createCustodyTestWallet();
    await openCardanoCustodyAccount(wallet, {
      record,
      device: creatorBinding(),
      name: 'Mine',
    });

    await openCardanoCustodyAccount(wallet, { record, name: 'Mine' });

    expect(
      custodyAccount(accountId)?.blockchainSpecific.device,
    ).toBeUndefined();
  });

  it('restores the account of a held wallet that lost it', async () => {
    const { wallet, wallets$, dispatch, custodyAccount } =
      createCustodyTestWallet();
    const { entity } = await openCardanoCustodyAccount(wallet, {
      record,
      name: 'Mine',
    });
    wallets$.next([{ ...entity, accounts: [] }]);

    await openCardanoCustodyAccount(wallet, { record, name: 'Mine' });

    expect(dispatch).toHaveBeenLastCalledWith('wallets.updateWallet', {
      id: walletId,
      changes: { accounts: entity.accounts },
    });
    expect(custodyAccount(accountId)).toBeDefined();
  });
});

describe('exportCardanoCustodyAccountRecord', () => {
  it('exports the record of an account in the wallet', async () => {
    const { wallet } = createCustodyTestWallet();
    await openCardanoCustodyAccount(wallet, { record, name: 'Mine' });

    await expect(
      exportCardanoCustodyAccountRecord(wallet, { accountId }),
    ).resolves.toEqual(record);
  });

  it('refuses an account the wallet does not hold', async () => {
    const { wallet } = createCustodyTestWallet();

    await expect(
      exportCardanoCustodyAccountRecord(wallet, { accountId }),
    ).rejects.toMatchObject({ reason: 'unknown-account' });
  });

  it('refuses a persisted account whose identity does not derive', async () => {
    const { wallet, wallets$ } = createCustodyTestWallet();
    const { entity } = await openCardanoCustodyAccount(wallet, {
      record,
      name: 'Mine',
    });
    const [account] = entity.accounts;
    wallets$.next([
      {
        ...entity,
        accounts: [
          {
            ...account,
            blockchainSpecific: {
              ...account.blockchainSpecific,
              stakeScriptHash: 'ab'.repeat(28),
            },
          },
        ],
      } as never,
    ]);

    await expect(
      exportCardanoCustodyAccountRecord(wallet, { accountId }),
    ).rejects.toBeInstanceOf(CardanoCustodyInvalidOperationError);
  });

  it('refuses a persisted account of an unsupported contract version', async () => {
    const { wallet, wallets$ } = createCustodyTestWallet();
    const { entity } = await openCardanoCustodyAccount(wallet, {
      record,
      name: 'Mine',
    });
    const [account] = entity.accounts;
    wallets$.next([
      {
        ...entity,
        accounts: [
          {
            ...account,
            blockchainSpecific: {
              ...account.blockchainSpecific,
              accountValidatorHash: 'cd'.repeat(28),
            },
          },
        ],
      } as never,
    ]);

    await expect(
      exportCardanoCustodyAccountRecord(wallet, { accountId }),
    ).rejects.toBeInstanceOf(CardanoCustodyUnsupportedVersionError);
  });
});

describe('exportCardanoCustodyAgentPolicy', () => {
  const openGranted = async () => {
    const test = createCustodyTestWallet();
    await openCardanoCustodyAccount(test.wallet, { record, name: 'Mine' });
    test.settledUtxos$.next({ [accountId]: [grantedControl, agentGrantUtxo] });
    return test;
  };

  it('exports the grant from its confirmed grant UTxO', async () => {
    const { wallet } = await openGranted();

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).resolves.toEqual({
      type: 'cardano-custody-agent-policy',
      version: 2,
      account: record,
      grantee: agentGrant.grantee,
      grant: {
        slot: '0',
        generation: '0',
        token: `${record.accountValidatorHash}${record.stakeScriptHash}00000000`,
        asset: { policyId: '', assetName: '' },
        perCallCap: '10000000',
        cap: '15000000',
        lovelacePerCallCap: '0',
        lovelaceCap: '0',
        expiresAt: agentGrant.scope.expiresAt.toString(),
        recipients: [],
      },
    });
  });

  it('refuses a grant that breaks an authoring rule', async () => {
    const { wallet, settledUtxos$ } = await openGranted();
    settledUtxos$.next({
      [accountId]: [
        grantedControl,
        grantUtxo({
          ...agentGrant,
          scope: { ...agentGrant.scope, lovelacePerCallCap: 1n },
        }),
      ],
    });

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).rejects.toMatchObject({ reason: 'invalid-grant' });
  });

  it.each([
    ['revoked', revokedState],
    ['superseded', { ...grantedState, grantGeneration: 1n }],
  ])('refuses a %s grant', async (liveness, state) => {
    const { wallet, settledUtxos$ } = await openGranted();
    settledUtxos$.next({
      [accountId]: [utxo(0x10, controlOutput(state)), agentGrantUtxo],
    });

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).rejects.toEqual(
      new CardanoCustodyInvalidOperationError('dead-grant', {
        slot: 0n,
        liveness,
      }),
    );
  });

  it('refuses a slot no confirmed grant UTxO holds', async () => {
    const { wallet } = await openGranted();

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 1n }),
    ).rejects.toMatchObject({ reason: 'unknown-grant' });
  });

  it('does not export a grant that waits in a submitted transaction', async () => {
    const { wallet, settledUtxos$, activities$ } = await openGranted();
    settledUtxos$.next({ [accountId]: [liveControl] });
    const activity = derivePendingActivityFromCbor({
      serializedTx: HexBytes(transactionOf(issueGrantShape()).toCbor()),
      accountId,
      accountAddresses: [record.address as never],
      accountUtxos: [liveControl],
    });
    activities$.next({ [accountId]: [activity!] });

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).rejects.toMatchObject({ reason: 'unknown-grant' });
  });

  it('refuses an account with no confirmed control state', async () => {
    const { wallet, settledUtxos$ } = await openGranted();
    settledUtxos$.next({ [accountId]: [] });

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).rejects.toMatchObject({
      reason: 'account-not-live',
      detail: { status: 'notCreated' },
    });
  });

  it("refuses while the account network's protocol parameters are unknown", async () => {
    const { wallet, networkInfo$ } = await openGranted();
    networkInfo$.next({});

    await expect(
      exportCardanoCustodyAgentPolicy(wallet, { accountId, slot: 0n }),
    ).rejects.toMatchObject({
      reason: 'account-not-live',
      detail: { status: 'unsynced' },
    });
  });
});
