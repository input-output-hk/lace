import { getAdaTokenTickerByNetwork } from '@lace-contract/cardano-context';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  hasNonMigratableRole,
  hasPoolLeftToChoose,
  isMigratableRow,
  migrateWalletActions,
  migrateWalletReducers,
  migrateWalletSelectors,
  type AccountMappingEntry,
  type DiscoverySummary,
  type MigrateWalletState,
} from '../../src/store/slice';

const reducer = migrateWalletReducers.migrateWallet;
const actions = migrateWalletActions.migrateWallet;
const selectors = migrateWalletSelectors.migrateWallet;

const destinationWalletId = WalletId('destination-wallet');
const destinationAccountId = AccountId('destination-account');
const sourceWalletId = WalletId('source-wallet');
const sourceAccountId = AccountId('source-account');

const discovery: DiscoverySummary = {
  utxoCount: 3,
  totalCoin: '11000000000',
  assets: [
    {
      id: 'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235484f534b59',
      quantity: '1250000000',
    },
    {
      id: '1d7f33bd23d85e1a25d87d86fac4f199c3197a2f7afeb662a0f34e1e',
      quantity: '7',
    },
  ],
  withdrawableRewards: '1000000',
  retainedStakeDeposit: '2000000',
  estimatedFee: '173641',
  sweptAccountCount: 1,
  scannedThroughAccountIndex: 10,
  scriptUtxoCount: 0,
  chunkCount: 1,
};

const reviewedPlan = {
  chainId: { networkId: 0, networkMagic: 1 },
  protocolParameters: { maxTxSize: 16_384 },
  utxos: [],
  addresses: [],
  signingAccounts: [],
} as unknown as Parameters<
  typeof actions.discoveryCompleted
>[0]['reviewedPlan'];

const initial: MigrateWalletState = { step: 'idle' };

describe('isMigratableRow', () => {
  const row = (
    overrides: Partial<AccountMappingEntry>,
  ): AccountMappingEntry => ({
    sourceAccountIndex: 1,
    destinationAccountIndex: 1,
    coin: '1000000',
    assetCount: 0,
    utxoCount: 1,
    ...overrides,
  });

  /**
   * The rule: an account migrates only if its own UTxOs can fund its own
   * transaction, reward withdrawal included. Holding UTxOs is not enough — an
   * account holding dust used to pass the old `utxoCount > 0` proxy, get
   * promised on the review, and then fail the build at sweep time, which failed
   * the whole migration.
   */
  it('refuses an account whose own UTxOs cannot fund its transaction', () => {
    expect(isMigratableRow(row({ canFundOwnTransaction: false }))).toBe(false);
  });

  it('accepts an account that can fund its own transaction', () => {
    expect(isMigratableRow(row({ canFundOwnTransaction: true }))).toBe(true);
  });

  // Rewards cannot pay a fee, so an account with no UTxOs never migrates —
  // whatever it still holds stays with the wallet the user keeps.
  it('refuses an account with no UTxOs', () => {
    expect(isMigratableRow(row({ utxoCount: 0, coin: '0' }))).toBe(false);
  });

  // A mapping persisted by an older run carries no verdict; the UTxO proxy is
  // the only thing available, so behaviour there is unchanged.
  it('falls back to the UTxO count when no verdict was recorded', () => {
    expect(isMigratableRow(row({}))).toBe(true);
    expect(isMigratableRow(row({ utxoCount: 0 }))).toBe(false);
  });
});

describe('migrateWallet reducer', () => {
  it('wizardOpened → intro, resetting any prior run', () => {
    const previous: MigrateWalletState = {
      step: 'failed',
      errorKey: 'migrate-wallet.error.sweep-failed',
      failedStep: 'sweeping',
      sweepTxId: 'deadbeef',
    };
    expect(reducer(previous, actions.wizardOpened())).toEqual({
      step: 'intro',
    });
  });

  it('introAcknowledged → chooseDestination', () => {
    expect(reducer({ step: 'intro' }, actions.introAcknowledged()).step).toBe(
      'chooseDestination',
    );
  });

  it('destinationTypeChosen fresh → createDestination', () => {
    const next = reducer(
      { step: 'chooseDestination' },
      actions.destinationTypeChosen({ type: 'fresh' }),
    );
    expect(next.step).toBe('createDestination');
    expect(next.destinationType).toBe('fresh');
  });

  it('destinationTypeChosen hardware → connectDevice', () => {
    const next = reducer(
      { step: 'chooseDestination' },
      actions.destinationTypeChosen({ type: 'hardware' }),
    );
    expect(next.step).toBe('connectDevice');
    expect(next.destinationType).toBe('hardware');
  });

  it('destinationTypeChosen existing → stays at chooseDestination', () => {
    const next = reducer(
      { step: 'chooseDestination' },
      actions.destinationTypeChosen({ type: 'existing' }),
    );
    expect(next.step).toBe('chooseDestination');
    expect(next.destinationType).toBe('existing');
  });

  it('destinationTypeChosen is a no-op from a step other than chooseDestination', () => {
    for (const step of ['idle', 'intro', 'review'] as const) {
      expect(
        reducer({ step }, actions.destinationTypeChosen({ type: 'fresh' }))
          .step,
      ).toBe(step);
    }
  });

  it('existingWalletSelected → chooseSource with the destination ids', () => {
    const next = reducer(
      { step: 'chooseDestination', destinationType: 'existing' },
      actions.existingWalletSelected({
        destinationWalletId,
        destinationAccountId,
      }),
    );
    expect(next.step).toBe('chooseSource');
    expect(next.destinationWalletId).toBe(destinationWalletId);
    expect(next.destinationAccountId).toBe(destinationAccountId);
  });

  it('existingWalletSelected is a no-op when destinationType is not existing', () => {
    const next = reducer(
      { step: 'chooseDestination', destinationType: 'fresh' },
      actions.existingWalletSelected({
        destinationWalletId,
        destinationAccountId,
      }),
    );
    expect(next.step).toBe('chooseDestination');
  });

  it('hwDeviceConnected({ needsPassword: false }) → creatingDestination from connectDevice', () => {
    expect(
      reducer(
        { step: 'connectDevice' },
        actions.hwDeviceConnected({ needsPassword: false }),
      ).step,
    ).toBe('creatingDestination');
  });

  it('hwDeviceConnected({ needsPassword: true }) → createDestination from connectDevice', () => {
    const hwDestination = {
      optionId: 'trezor-cardano' as never,
      blockchainName: 'Cardano' as never,
      derivationType: 'ICARUS_TREZOR' as never,
    };
    const next = reducer(
      { step: 'connectDevice' },
      actions.hwDeviceConnected({ needsPassword: true, hwDestination }),
    );
    expect(next.step).toBe('createDestination');
    expect(next.pendingHwDestination).toEqual(hwDestination);
  });

  it('hwDeviceConnected is a no-op from a step other than connectDevice', () => {
    for (const step of ['idle', 'intro', 'chooseDestination'] as const) {
      expect(
        reducer({ step }, actions.hwDeviceConnected({ needsPassword: false }))
          .step,
      ).toBe(step);
    }
  });

  it('wizardCancelled → idle from any step', () => {
    for (const step of ['intro', 'review', 'sweeping', 'failed'] as const) {
      expect(reducer({ step, discovery }, actions.wizardCancelled())).toEqual(
        initial,
      );
    }
  });

  it('destinationCreationStarted → creatingDestination, clears error and pendingHwDestination', () => {
    const previous: MigrateWalletState = {
      step: 'createDestination',
      errorKey: 'migrate-wallet.error.wallet-creation-failed',
      pendingHwDestination: {
        optionId: 'trezor-cardano' as never,
        blockchainName: 'Cardano' as never,
      },
    };
    const next = reducer(previous, actions.destinationCreationStarted());
    expect(next.step).toBe('creatingDestination');
    expect(next.errorKey).toBeUndefined();
    expect(next.pendingHwDestination).toBeUndefined();
  });

  it('passwordChosen → backupPhrase, backupAcknowledged → verifyPhrase, backupRevisited → backupPhrase', () => {
    expect(
      reducer({ step: 'createDestination' }, actions.passwordChosen()).step,
    ).toBe('backupPhrase');
    expect(
      reducer({ step: 'backupPhrase' }, actions.backupAcknowledged()).step,
    ).toBe('verifyPhrase');
    expect(
      reducer({ step: 'verifyPhrase' }, actions.backupRevisited()).step,
    ).toBe('backupPhrase');
  });

  it('destinationCreated → chooseSource with the destination ids', () => {
    const next = reducer(
      { step: 'creatingDestination' },
      actions.destinationCreated({ destinationWalletId, destinationAccountId }),
    );
    expect(next).toEqual({
      step: 'chooseSource',
      destinationWalletId,
      destinationAccountId,
    });
  });

  // One decision on one screen: the phrase and device journeys diverge here,
  // and the choice lives in redux so a popup remount mid-connect (the USB
  // picker steals focus) cannot dump a hardware user onto the phrase screen.
  it('sourceTypeChosen routes phrase → enterSeed and hardware → connectSourceDevice', () => {
    expect(
      reducer(
        { step: 'chooseSource' },
        actions.sourceTypeChosen({ type: 'phrase' }),
      ).step,
    ).toBe('enterSeed');
    expect(
      reducer(
        { step: 'chooseSource' },
        actions.sourceTypeChosen({ type: 'hardware' }),
      ).step,
    ).toBe('connectSourceDevice');
    // Guarded: a stray choice from any other step is a no-op.
    expect(
      reducer({ step: 'review' }, actions.sourceTypeChosen({ type: 'phrase' }))
        .step,
    ).toBe('review');
  });

  it('sourceTypeChosen routes loaded → chooseLoadedSource', () => {
    expect(
      reducer(
        { step: 'chooseSource' },
        actions.sourceTypeChosen({ type: 'loaded' }),
      ).step,
    ).toBe('chooseLoadedSource');
  });

  it('loadedSourceChosen skips the import and goes straight to discovering', () => {
    const next = reducer(
      { step: 'chooseLoadedSource' },
      actions.loadedSourceChosen({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'testnet',
      }),
    );
    expect(next.step).toBe('discovering');
    expect(next.sourceWalletId).toBe(sourceWalletId);
    expect(next.sourceAccountId).toBe(sourceAccountId);
    expect(next.sourceNetworkType).toBe('testnet');

    // Guarded: only the picker step may set the source this way.
    expect(
      reducer(
        { step: 'review' },
        actions.loadedSourceChosen({
          sourceWalletId,
          sourceAccountId,
          sourceNetworkType: 'testnet',
        }),
      ).step,
    ).toBe('review');
  });

  it('wizardOpened carries a pre-selected source into the run', () => {
    const next = reducer(
      { step: 'idle' },
      actions.wizardOpened({
        origin: 'wallet-settings',
        sourceWalletId,
      }),
    );
    expect(next.step).toBe('intro');
    expect(next.pendingSourceWalletId).toBe(sourceWalletId);
  });

  it('loadedSourceChosen consumes the pre-selection straight from the chooser', () => {
    const next = reducer(
      { step: 'chooseSource', pendingSourceWalletId: sourceWalletId },
      actions.loadedSourceChosen({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'testnet',
      }),
    );
    expect(next.step).toBe('discovering');
    expect(next.sourceWalletId).toBe(sourceWalletId);
    // Consumed: a later visit to the chooser is a real choice again.
    expect(next.pendingSourceWalletId).toBeUndefined();
  });

  it('stepBack returns the loaded-source picker to the choice', () => {
    expect(
      reducer({ step: 'chooseLoadedSource' }, actions.stepBack()).step,
    ).toBe('chooseSource');
  });

  it('stepBack returns both source journeys to the choice', () => {
    expect(reducer({ step: 'enterSeed' }, actions.stepBack()).step).toBe(
      'chooseSource',
    );
    expect(
      reducer({ step: 'connectSourceDevice' }, actions.stepBack()).step,
    ).toBe('chooseSource');
  });

  it('sourceImportStarted → importingSource', () => {
    expect(
      reducer({ step: 'enterSeed' }, actions.sourceImportStarted()).step,
    ).toBe('importingSource');
  });

  // Kept through discovery: the account scan exports xpubs for accounts 1+
  // from this device, so the descriptor must survive popup remounts.
  it('sourceImportStarted stashes the hardware source device params', () => {
    const hwSource = {
      optionId: 'ledger',
      device: { id: 'usb-1' },
      blockchainName: 'Cardano',
    } as never;
    const next = reducer(
      { step: 'enterSeed' },
      actions.sourceImportStarted({ hwSource }),
    );
    expect(next.pendingHwSource).toEqual(hwSource);
    // And a phrase import leaves none behind from an earlier device attempt.
    expect(
      reducer(
        { step: 'enterSeed', pendingHwSource: hwSource },
        actions.sourceImportStarted(),
      ).pendingHwSource,
    ).toBeUndefined();
  });

  // The hint renders only while the import screen is live; a hint landing
  // after cancel or a fresh attempt must not resurrect stale guidance.
  it('sourceImportDeviceWaiting sets the hint on importingSource only, cleared by restart and success', () => {
    const waiting = actions.sourceImportDeviceWaiting({
      hintKey: 'hw-error.device-locked.subtitle',
    });
    expect(
      reducer({ step: 'importingSource' }, waiting).deviceWaitHintKey,
    ).toBe('hw-error.device-locked.subtitle');
    expect(
      reducer({ step: 'idle' }, waiting).deviceWaitHintKey,
    ).toBeUndefined();
    expect(
      reducer(
        {
          step: 'importingSource',
          deviceWaitHintKey: 'hw-error.device-locked.subtitle',
        },
        actions.sourceImported({
          sourceWalletId,
          sourceAccountId,
          sourceNetworkType: 'testnet',
        }),
      ).deviceWaitHintKey,
    ).toBeUndefined();
    expect(
      reducer(
        {
          step: 'enterSeed',
          deviceWaitHintKey: 'hw-error.device-locked.subtitle',
        },
        actions.sourceImportStarted(),
      ).deviceWaitHintKey,
    ).toBeUndefined();
  });

  it('sourceImported → discovering with the source ids and network type together', () => {
    const next = reducer(
      { step: 'importingSource' },
      actions.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'testnet',
      }),
    );
    expect(next).toEqual({
      step: 'discovering',
      sourceWalletId,
      sourceAccountId,
      sourceNetworkType: 'testnet',
    });
  });

  it('discoveryCompleted → review with the summary', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({ discovery, reviewedPlan }),
    );
    expect(next.step).toBe('review');
    expect(next.discovery).toEqual(discovery);
  });

  const mappingRow = (sourceAccountIndex: number) => ({
    sourceAccountIndex,
    destinationAccountIndex: sourceAccountIndex,
    coin: '1000000',
    assetCount: 0,
    utxoCount: 1,
  });

  // Only a multi-account source has a real choice: for one account the two
  // modes build the identical transaction set, so the step is skipped.
  it('discoveryCompleted routes multi-account sources through chooseMode', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0), mappingRow(2)],
        supportsPreservation: true,
      }),
    );
    expect(next.step).toBe('chooseMode');
    expect(next.migrationMode).toBeUndefined();
    expect(next.accountMapping).toHaveLength(2);
  });

  it('discoveryCompleted skips the mode choice for a single-account source', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0)],
      }),
    );
    expect(next.step).toBe('review');
    expect(next.migrationMode).toBe('consolidate');
  });

  // The pool choice comes LAST before the review, after every account question
  // is settled — all three routes into the review agree on that (LW-15293).
  it('discoveryCompleted routes through choosePool when the target names no pool', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0)],
        needsPoolChoice: true,
      }),
    );
    expect(next.step).toBe('choosePool');
    expect(next.needsPoolChoice).toBe(true);
  });

  it('discoveryCompleted defers the pool choice behind the mode choice', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0), mappingRow(2)],
        supportsPreservation: true,
        needsPoolChoice: true,
      }),
    );
    expect(next.step).toBe('chooseMode');
    expect(next.needsPoolChoice).toBe(true);
  });

  it('discoveryCompleted defers the pool choice behind the device step', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0)],
        needsDestinationDevice: true,
        needsPoolChoice: true,
      }),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.needsPoolChoice).toBe(true);
  });

  it('migrationModeChosen routes to choosePool when no device step follows', () => {
    const next = reducer(
      { step: 'chooseMode', needsPoolChoice: true },
      actions.migrationModeChosen({
        mode: 'preserve',
        needsDestinationDevice: false,
      }),
    );
    expect(next.step).toBe('choosePool');
  });

  it('destinationTargetsResolved routes to choosePool when the choice is pending', () => {
    const next = reducer(
      { step: 'connectDestinationDevice', needsPoolChoice: true },
      actions.destinationTargetsResolved({
        resolvedDestinationIndexes: [0],
      }),
    );
    expect(next.step).toBe('choosePool');
  });

  it('poolChosen records the pick and advances to review, only from choosePool', () => {
    const pick = { poolId: 'pool1abc', ticker: 'PICK', ros: 0.031 };
    const next = reducer({ step: 'choosePool' }, actions.poolChosen(pick));
    expect(next.step).toBe('review');
    expect(next.chosenPool).toEqual(pick);

    // A stale selection arriving at any other step must not rewind the wizard.
    expect(reducer({ step: 'sweeping' }, actions.poolChosen(pick)).step).toBe(
      'sweeping',
    );
  });

  // Declining must not block the migration: the sweep proceeds and the review
  // states that rewards will not be set up.
  it('poolChoiceDeclined advances to review with no pool recorded, only from choosePool', () => {
    const next = reducer({ step: 'choosePool' }, actions.poolChoiceDeclined());
    expect(next.step).toBe('review');
    expect(next.chosenPool).toBeUndefined();

    expect(reducer({ step: 'review' }, actions.poolChoiceDeclined()).step).toBe(
      'review',
    );
  });

  it('stepBack from choosePool reopens the mode choice when it was offered', () => {
    const next = reducer(
      { step: 'choosePool', wasModeOffered: true, migrationMode: 'preserve' },
      actions.stepBack(),
    );
    expect(next.step).toBe('chooseMode');
    expect(next.migrationMode).toBeUndefined();
  });

  it('stepBack holds at choosePool when the mode choice was never offered', () => {
    const next = reducer(
      { step: 'choosePool', wasModeOffered: false },
      actions.stepBack(),
    );
    expect(next.step).toBe('choosePool');
  });

  // Reported by the destination's own capability, not its picker category: a
  // hardware wallet chosen as an EXISTING destination reports type 'existing',
  // and offering it preserve planned accounts it can never derive.
  // Preserve on a hardware destination needs one on-device approval per new
  // account, so the device is collected before the review rather than
  // discovered missing mid-sweep.
  it('migrationModeChosen routes either mode through the device step for a hardware destination', () => {
    const next = reducer(
      { step: 'chooseMode' },
      actions.migrationModeChosen({
        mode: 'preserve',
        needsDestinationDevice: true,
      }),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.migrationMode).toBe('preserve');

    // Consolidate lands in a fresh account too (FR-13), so it needs the device
    // just as much. Skipping it here swept into the account the user picked
    // while the review promised a new one.
    expect(
      reducer(
        { step: 'chooseMode' },
        actions.migrationModeChosen({
          mode: 'consolidate',
          needsDestinationDevice: true,
        }),
      ).step,
    ).toBe('connectDestinationDevice');

    // Nothing to create — the landing account already exists — so no device is
    // asked for in either mode.
    expect(
      reducer(
        { step: 'chooseMode' },
        actions.migrationModeChosen({
          mode: 'preserve',
          needsDestinationDevice: false,
        }),
      ).step,
    ).toBe('review');
  });

  /**
   * The device is stored but the step HOLDS. Its account keys are what the
   * freshness probe needs, and advancing here put the review on screen naming
   * landing accounts nothing had checked against the chain — the one promise
   * that screen exists to make.
   */
  it('destinationDeviceConnected stores the device without advancing to review', () => {
    const device = {
      optionId: 'ledger' as never,
      device: { id: 'usb-1' } as never,
      blockchainName: 'Cardano' as never,
    };
    const next = reducer(
      { step: 'connectDestinationDevice', migrationMode: 'preserve' },
      actions.destinationDeviceConnected({ device }),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.pendingHwDestinationDevice).toEqual(device);
  });

  it('destinationTargetsResolved rewrites the plan with the checked accounts, then reviews', () => {
    const row = (destinationAccountIndex: number) => ({
      sourceAccountIndex: 0,
      destinationAccountIndex,
      coin: '1000000',
      assetCount: 0,
      utxoCount: 1,
    });
    const next = reducer(
      { step: 'connectDestinationDevice', accountMapping: [row(1)] },
      actions.destinationTargetsResolved({
        accountMapping: [row(4)],
        resolvedDestinationIndexes: [4],
      }),
    );
    expect(next.step).toBe('review');
    // The review now names index 4 — what the probe settled on — not the 1 the
    // plan guessed before anything was checked.
    expect(next.accountMapping?.[0].destinationAccountIndex).toBe(4);
    // Carried so the sweep derives these instead of probing again, which would
    // cost another on-device approval per account.
    expect(next.resolvedDestinationIndexes).toEqual([4]);
  });

  it('destinationTargetsResolved is a no-op away from the device step', () => {
    expect(
      reducer(
        { step: 'review' },
        actions.destinationTargetsResolved({
          resolvedDestinationIndexes: [2],
        }),
      ).resolvedDestinationIndexes,
    ).toBeUndefined();
  });

  it('stepBack from the destination device step reopens the mode choice', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        migrationMode: 'preserve',
        wasModeOffered: true,
      },
      actions.stepBack(),
    );
    expect(next.step).toBe('chooseMode');
    // The mode is re-chosen, so a back-out cannot leave preserve selected
    // with no device behind it.
    expect(next.migrationMode).toBeUndefined();
  });

  // Entered straight from discovery, because a single-account source is never
  // offered the mode choice. Reversing into that screen would offer preserve
  // where the two modes are identical.
  it('stepBack holds at the device step when the mode choice was never offered', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        migrationMode: 'consolidate',
        wasModeOffered: false,
      },
      actions.stepBack(),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.migrationMode).toBe('consolidate');
  });

  // The mode screen is where the device is normally collected; skipping it for
  // a single-account source must not skip the collection too.
  it('discoveryCompleted routes to the device step when consolidate must create its landing account', () => {
    const next = reducer(
      { step: 'discovering', destinationType: 'existing' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [
          {
            sourceAccountIndex: 0,
            destinationAccountIndex: 3,
            coin: '1000000',
            assetCount: 0,
            utxoCount: 1,
          },
        ],
        needsDestinationDevice: true,
      }),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.migrationMode).toBe('consolidate');
    expect(next.wasModeOffered).toBe(false);
  });

  it('discoveryCompleted consolidates when the destination cannot create accounts', () => {
    const next = reducer(
      { step: 'discovering', destinationType: 'existing' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0), mappingRow(1)],
        supportsPreservation: false,
      }),
    );
    expect(next.step).toBe('review');
    expect(next.migrationMode).toBe('consolidate');
  });

  it('discoveryCompleted consolidates a hardware destination without offering the choice', () => {
    const next = reducer(
      { step: 'discovering', destinationType: 'hardware' },
      actions.discoveryCompleted({
        discovery,
        reviewedPlan,
        accountMapping: [mappingRow(0), mappingRow(1)],
      }),
    );
    // A device cannot derive fresh accounts silently, so there is no
    // preserve path to offer.
    expect(next.step).toBe('review');
    expect(next.migrationMode).toBe('consolidate');
  });

  it('destinationAccountsPrepared re-points the wizard at the first landing account', () => {
    const prepared = [
      { destinationAccountIndex: 3, accountId: AccountId('fresh-3') },
      { destinationAccountIndex: 4, accountId: AccountId('fresh-4') },
    ];
    const next = reducer(
      { step: 'sweeping', destinationAccountId },
      actions.destinationAccountsPrepared({ accounts: prepared }),
    );
    expect(next.destinationAccountId).toBe(prepared[0].accountId);
    expect(next.preparedDestinationAccounts).toEqual(prepared);

    // Guarded: only the sweep prepares accounts.
    expect(
      reducer(
        { step: 'review', destinationAccountId },
        actions.destinationAccountsPrepared({ accounts: prepared }),
      ).destinationAccountId,
    ).toBe(destinationAccountId);
  });

  // The plan names the next index past the highest one loaded; the freshness
  // probe may have walked further because an index turned out used on chain.
  // Everything downstream — report, delegation, done screen — reads the mapping,
  // so it has to name where the funds actually went.
  it('destinationAccountsPrepared repoints the mapping onto the accounts prepared', () => {
    const next = reducer(
      {
        step: 'sweeping',
        destinationAccountId,
        migrationMode: 'preserve',
        accountMapping: [
          { ...mappingRow(0), destinationAccountIndex: 1 },
          { ...mappingRow(1), destinationAccountIndex: 2 },
        ],
      },
      actions.destinationAccountsPrepared({
        accounts: [
          { destinationAccountIndex: 5, accountId: AccountId('fresh-5') },
          { destinationAccountIndex: 6, accountId: AccountId('fresh-6') },
        ],
      }),
    );
    expect(
      next.accountMapping?.map(row => row.destinationAccountIndex),
    ).toEqual([5, 6]);
  });

  it('destinationAccountsPrepared points every row at the one consolidated account', () => {
    const next = reducer(
      {
        step: 'sweeping',
        destinationAccountId,
        migrationMode: 'consolidate',
        accountMapping: [
          { ...mappingRow(0), destinationAccountIndex: 2 },
          { ...mappingRow(1), destinationAccountIndex: 3 },
        ],
      },
      actions.destinationAccountsPrepared({
        accounts: [
          { destinationAccountIndex: 7, accountId: AccountId('fresh-7') },
        ],
      }),
    );
    expect(
      next.accountMapping?.map(row => row.destinationAccountIndex),
    ).toEqual([7, 7]);
  });

  it('migrationModeChosen → review with the mode, only from chooseMode', () => {
    const next = reducer(
      { step: 'chooseMode' },
      actions.migrationModeChosen({ mode: 'preserve' }),
    );
    expect(next.step).toBe('review');
    expect(next.migrationMode).toBe('preserve');

    expect(
      reducer(
        { step: 'review' },
        actions.migrationModeChosen({ mode: 'consolidate' }),
      ).migrationMode,
    ).toBeUndefined();
  });

  it('migrationUnsupported → unsupported with the errorKey and stuck amount', () => {
    const next = reducer(
      { step: 'discovering' },
      actions.migrationUnsupported({
        errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
        amount: {
          value: '1500000',
          labelKey: 'migrate-wallet.unsupported.stuck-rewards',
        },
      }),
    );
    expect(next).toEqual({
      step: 'unsupported',
      errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
      unsupportedAmount: {
        value: '1500000',
        labelKey: 'migrate-wallet.unsupported.stuck-rewards',
      },
    });
  });

  it('migrationUnsupported → unsupported from sweeping (sweep-time reward re-check)', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.migrationUnsupported({
        errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
        amount: {
          value: '3000000',
          labelKey: 'migrate-wallet.unsupported.stuck-rewards',
        },
      }),
    );
    expect(next.step).toBe('unsupported');
    expect(next.errorKey).toBe(
      'migrate-wallet.error.rewards-not-vote-delegated',
    );
  });

  it('migrationUnsupported is a no-op from a step other than discovering or sweeping', () => {
    for (const step of ['idle', 'review', 'done'] as const) {
      expect(
        reducer(
          { step },
          actions.migrationUnsupported({
            errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
            amount: {
              value: '1500000',
              labelKey: 'migrate-wallet.unsupported.stuck-rewards',
            },
          }),
        ).step,
      ).toBe(step);
    }
  });

  it('sweepStarted → sweeping from review, clearing a stale error', () => {
    const next = reducer(
      { step: 'review', errorKey: 'migrate-wallet.error.sweep-failed' },
      actions.sweepStarted(),
    );
    expect(next.step).toBe('sweeping');
    expect(next.errorKey).toBeUndefined();
  });

  it('sweepStarted is a no-op from a step other than review (the attestation gate)', () => {
    for (const step of ['idle', 'failed', 'discovering'] as const) {
      expect(reducer({ step }, actions.sweepStarted()).step).toBe(step);
    }
  });

  it('sweepStarted is a no-op when discovery has nothing to sweep', () => {
    const next = reducer(
      {
        step: 'review',
        discovery: {
          ...discovery,
          utxoCount: 0,
          withdrawableRewards: '0',
          retainedStakeDeposit: '0',
        },
      },
      actions.sweepStarted(),
    );
    expect(next.step).toBe('review');
  });

  it('discoveryRetryRequested → discovering from a discovery failure, clearing the error', () => {
    const next = reducer(
      {
        step: 'failed',
        failedStep: 'discovering',
        errorKey: 'migrate-wallet.error.discovery-failed',
      },
      actions.discoveryRetryRequested({
        sourceWalletId: WalletId('src-1'),
        sourceAccountId: AccountId('acct-1'),
        sourceNetworkType: 'mainnet',
      }),
    );
    expect(next.step).toBe('discovering');
    expect(next.errorKey).toBeUndefined();
    expect(next.failedStep).toBeUndefined();
    expect(next.sourceWalletId).toBe('src-1');
  });

  it('discoveryRetryRequested is a no-op when the failure was not a discovery', () => {
    const next = reducer(
      {
        step: 'failed',
        failedStep: 'sweeping',
        errorKey: 'migrate-wallet.error.sweep-failed',
      },
      actions.discoveryRetryRequested({
        sourceWalletId: WalletId('src-1'),
        sourceAccountId: AccountId('acct-1'),
        sourceNetworkType: 'mainnet',
      }),
    );
    expect(next.step).toBe('failed');
    expect(next.errorKey).toBe('migrate-wallet.error.sweep-failed');
  });

  it('discoveryRetryRequested is a no-op outside the failed step', () => {
    const next = reducer(
      { step: 'review', failedStep: 'discovering' },
      actions.discoveryRetryRequested({
        sourceWalletId: WalletId('src-1'),
        sourceAccountId: AccountId('acct-1'),
        sourceNetworkType: 'mainnet',
      }),
    );
    expect(next.step).toBe('review');
  });

  it('sweepAuthCancelled → review when the prompt was dismissed before any chunk', () => {
    const next = reducer(
      { step: 'sweeping', errorKey: 'migrate-wallet.error.sweep-failed' },
      actions.sweepAuthCancelled(),
    );
    expect(next.step).toBe('review');
    expect(next.errorKey).toBeUndefined();
  });

  it('sweepAuthCancelled → sweepPaused once a chunk is on-chain, never stranded', () => {
    // Rewinding to review would misdescribe a plan whose earlier inputs are
    // already spent, but staying on `sweeping` would leave the wizard with no
    // actions at all — so it returns to the paused screen the retry came from.
    const next = reducer(
      {
        step: 'sweeping',
        sweepProgress: {
          totalChunks: 3,
          submittedChunks: [{ index: 0, txId: 'tx0' }],
        },
      },
      actions.sweepAuthCancelled(),
    );
    expect(next.step).toBe('sweepPaused');
    expect(next.failedStep).toBe('sweeping');
    expect(next.errorKey).toBeUndefined();
    expect(next.sweepProgress?.submittedChunks).toHaveLength(1);
  });

  it('sweepAuthCancelled is a no-op outside the sweeping step', () => {
    const next = reducer({ step: 'review' }, actions.sweepAuthCancelled());
    expect(next.step).toBe('review');
  });

  // The failure key says the sweep stopped; only the hint says why the device
  // stopped it, which is the difference between an unactionable screen and one
  // that names the fix.
  it('sweepPaused carries the device guidance alongside the failure', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.sweepPaused({
        errorKey: 'migrate-wallet.error.sweep-failed',
        deviceHintKey: 'hw-error.app-not-open.subtitle',
      }),
    );
    expect(next.step).toBe('sweepPaused');
    expect(next.deviceWaitHintKey).toBe('hw-error.app-not-open.subtitle');
  });

  it('stepFailed carries the device guidance for a failure a device raised', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.stepFailed({
        errorKey: 'migrate-wallet.error.sweep-failed',
        deviceHintKey: 'hw-error.device-locked.subtitle',
      }),
    );
    expect(next.step).toBe('failed');
    expect(next.deviceWaitHintKey).toBe('hw-error.device-locked.subtitle');
  });

  /**
   * A locked Ledger is the ordinary way this step fails, and nothing has moved
   * yet — so the user stays on the connect screen with the reason, the way
   * every other hardware surface reports it, rather than reaching a dead end.
   */
  it('destinationDeviceFailed keeps the user on the connect screen with the reason', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        pendingHwDestinationDevice: {
          optionId: 'ledger-1',
          blockchainName: 'Cardano',
        } as never,
      },
      actions.destinationDeviceFailed({
        deviceHintKey: 'hw-error.device-locked.subtitle',
      }),
    );
    expect(next.step).toBe('connectDestinationDevice');
    expect(next.deviceWaitHintKey).toBe('hw-error.device-locked.subtitle');
  });

  /**
   * The handle that just failed is the one a retry would reuse, and reusing a
   * dead WebUSB transport is what answers "Invalid channel" on the second
   * attempt. Dropping it forces a reconnect.
   */
  it('destinationDeviceFailed drops the device that failed', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        pendingHwDestinationDevice: {
          optionId: 'ledger-1',
          blockchainName: 'Cardano',
        } as never,
      },
      actions.destinationDeviceFailed({
        deviceHintKey: 'hw-error.device-locked.subtitle',
      }),
    );
    expect(next.pendingHwDestinationDevice).toBeUndefined();
  });

  it('destinationDeviceFailed ignores a wizard that has moved on', () => {
    const next = reducer(
      { step: 'review' },
      actions.destinationDeviceFailed({
        deviceHintKey: 'hw-error.device-locked.subtitle',
      }),
    );
    expect(next.step).toBe('review');
    expect(next.deviceWaitHintKey).toBeUndefined();
  });

  // The hint describes one visit's failure. Kept, Back → chooseMode →
  // reconnect would greet a fresh connect screen with "device is locked".
  it('stepBack from the connect screen drops the carried device hint', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        wasModeOffered: true,
        deviceWaitHintKey: 'hw-error.device-locked.subtitle',
      },
      actions.stepBack(),
    );
    expect(next.step).toBe('chooseMode');
    expect(next.deviceWaitHintKey).toBeUndefined();
  });

  it('destinationTargetsResolved clears the carried device hint', () => {
    const next = reducer(
      {
        step: 'connectDestinationDevice',
        deviceWaitHintKey: 'hw-error.device-locked.subtitle',
      },
      actions.destinationTargetsResolved({ resolvedDestinationIndexes: [0] }),
    );
    expect(next.step).toBe('review');
    expect(next.deviceWaitHintKey).toBeUndefined();
  });

  // A retry that kept the previous attempt's hint would tell the user to unlock
  // a device that is now unlocked, next to a failure that has already cleared.
  it('sweepRetryRequested clears the device guidance with the error', () => {
    const next = reducer(
      {
        step: 'sweepPaused',
        errorKey: 'migrate-wallet.error.sweep-failed',
        deviceWaitHintKey: 'hw-error.device-locked.subtitle',
      },
      actions.sweepRetryRequested(),
    );
    expect(next.step).toBe('sweeping');
    expect(next.deviceWaitHintKey).toBeUndefined();
  });

  it('sweepRetryRequested → sweeping from failed, clearing a stale error', () => {
    const next = reducer(
      {
        step: 'failed',
        failedStep: 'sweeping',
        errorKey: 'migrate-wallet.error.sweep-failed',
      },
      actions.sweepRetryRequested(),
    );
    expect(next.step).toBe('sweeping');
    expect(next.errorKey).toBeUndefined();
  });

  it('sweepRetryRequested is a no-op when the failure was not a sweep', () => {
    const next = reducer(
      {
        step: 'failed',
        failedStep: 'discovering',
        errorKey: 'migrate-wallet.error.discovery-failed',
      },
      actions.sweepRetryRequested(),
    );
    expect(next.step).toBe('failed');
    expect(next.errorKey).toBe('migrate-wallet.error.discovery-failed');
  });

  it('sweepRetryRequested → sweeping from sweepPaused, preserving sweepProgress', () => {
    const next = reducer(
      {
        step: 'sweepPaused',
        errorKey: 'migrate-wallet.error.sweep-failed',
        sweepProgress: {
          totalChunks: 3,
          submittedChunks: [{ index: 0, txId: 'tx0' }],
        },
      },
      actions.sweepRetryRequested(),
    );
    expect(next.step).toBe('sweeping');
    expect(next.errorKey).toBeUndefined();
    expect(next.sweepProgress).toEqual({
      totalChunks: 3,
      submittedChunks: [{ index: 0, txId: 'tx0' }],
    });
  });

  it('sweepChunkSubmitted appends to sweepProgress', () => {
    const state: MigrateWalletState = { step: 'sweeping' };
    const after1 = reducer(
      state,
      actions.sweepChunkSubmitted({ index: 0, txId: 'tx0', totalChunks: 3 }),
    );
    expect(after1.sweepProgress).toEqual({
      totalChunks: 3,
      submittedChunks: [{ index: 0, txId: 'tx0' }],
    });
    const after2 = reducer(
      after1,
      actions.sweepChunkSubmitted({ index: 1, txId: 'tx1', totalChunks: 3 }),
    );
    expect(after2.sweepProgress).toEqual({
      totalChunks: 3,
      submittedChunks: [
        { index: 0, txId: 'tx0' },
        { index: 1, txId: 'tx1' },
      ],
    });
  });

  it('sweepChunkSubmitted is a no-op from a step other than sweeping', () => {
    const state: MigrateWalletState = { step: 'review' };
    expect(
      reducer(
        state,
        actions.sweepChunkSubmitted({ index: 0, txId: 'tx0', totalChunks: 2 }),
      ),
    ).toEqual(state);
  });

  it('sweepPaused → sweepPaused from sweeping, with errorKey and failedStep', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.sweepPaused({
        errorKey: 'migrate-wallet.error.sweep-failed',
      }),
    );
    expect(next.step).toBe('sweepPaused');
    expect(next.errorKey).toBe('migrate-wallet.error.sweep-failed');
    expect(next.failedStep).toBe('sweeping');
  });

  it('sweepPaused does not clear sweepProgress', () => {
    const next = reducer(
      {
        step: 'sweeping',
        sweepProgress: {
          totalChunks: 3,
          submittedChunks: [{ index: 0, txId: 'tx0' }],
        },
      },
      actions.sweepPaused({
        errorKey: 'migrate-wallet.error.sweep-failed',
      }),
    );
    expect(next.sweepProgress).toEqual({
      totalChunks: 3,
      submittedChunks: [{ index: 0, txId: 'tx0' }],
    });
  });

  it('sweepPaused is a no-op from a step other than sweeping', () => {
    expect(
      reducer(
        { step: 'review' },
        actions.sweepPaused({
          errorKey: 'migrate-wallet.error.sweep-failed',
        }),
      ).step,
    ).toBe('review');
  });

  it('wizardCancelled resets sweepProgress', () => {
    const state: MigrateWalletState = {
      step: 'sweepPaused',
      sweepProgress: {
        totalChunks: 3,
        submittedChunks: [{ index: 0, txId: 'tx0' }],
      },
    };
    expect(
      reducer(state, actions.wizardCancelled()).sweepProgress,
    ).toBeUndefined();
  });

  it('attestationRefused → unsupported with the non-migratable-role reason', () => {
    const next = reducer({ step: 'review' }, actions.attestationRefused());
    expect(next).toEqual({
      step: 'unsupported',
      errorKey: 'migrate-wallet.error.non-migratable-role',
    });
  });

  it('attestationRefused is a no-op from a step other than review', () => {
    for (const step of ['idle', 'discovering', 'sweeping'] as const) {
      expect(reducer({ step }, actions.attestationRefused()).step).toBe(step);
    }
  });

  it('sweepSucceeded → delegating with the tx id, not straight to done', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.sweepSucceeded({ txId: '0dc01a6e' }),
    );
    expect(next).toEqual({
      step: 'delegating',
      // The swept funds are in flight, so the waiting screen opens on the
      // one stage that is actually happening.
      delegationPhase: 'settling',
      sweepTxId: '0dc01a6e',
    });
  });

  it('delegationPhaseChanged tracks the side-effect only while delegating', () => {
    const delegating = reducer(
      { step: 'delegating', delegationPhase: 'settling' },
      actions.delegationPhaseChanged({ phase: 'confirming' }),
    );
    expect(delegating.delegationPhase).toBe('confirming');

    // A straggler emission after the run settled must not resurrect a stage.
    const done = reducer(
      { step: 'done' },
      actions.delegationPhaseChanged({ phase: 'finishing' }),
    );
    expect(done.delegationPhase).toBeUndefined();
  });

  it('leaving the delegating step clears the phase, both ways out', () => {
    const paused = reducer(
      { step: 'delegating', delegationPhase: 'confirming' },
      actions.delegationPaused({
        errorKey: 'migrate-wallet.error.delegation-failed',
      }),
    );
    expect(paused.delegationPhase).toBeUndefined();

    const settled = reducer(
      { step: 'delegating', delegationPhase: 'finishing' },
      actions.delegationSettled({ outcome: { status: 'unavailable' } }),
    );
    expect(settled.delegationPhase).toBeUndefined();

    // Retrying starts the wait over from the only stage a retry can be in.
    const retried = reducer(
      { step: 'delegationPaused' },
      actions.delegationRetryRequested(),
    );
    expect(retried.delegationPhase).toBe('settling');
  });

  it('sweepSucceeded stores what the tx did as decimal strings, each in its own field', () => {
    // Distinct values on purpose: a copy-paste swap of fee and rewards would
    // survive a test that used the same number for both.
    const next = reducer(
      { step: 'sweeping' },
      actions.sweepSucceeded({
        txId: '0dc01a6e',
        fee: 180_000n,
        withdrawnRewards: 2_500_000n,
      }),
    );
    expect(next.sweptFee).toBe('180000');
    expect(next.sweptRewards).toBe('2500000');
  });

  it('stepFailed → failed, recording which step failed', () => {
    const next = reducer(
      { step: 'sweeping' },
      actions.stepFailed({ errorKey: 'migrate-wallet.error.sweep-failed' }),
    );
    expect(next).toEqual({
      step: 'failed',
      failedStep: 'sweeping',
      errorKey: 'migrate-wallet.error.sweep-failed',
    });
  });

  it('side-effect-driven transitions are no-ops from an unexpected step (late/stray emissions)', () => {
    // After cancel/remount the step is `idle`; a late import, discovery result,
    // creation, or sweep result must not force the machine forward.
    expect(
      reducer(
        { step: 'idle' },
        actions.destinationCreated({
          destinationWalletId,
          destinationAccountId,
        }),
      ),
    ).toEqual({ step: 'idle' });
    expect(
      reducer(
        { step: 'idle' },
        actions.sourceImported({
          sourceWalletId,
          sourceAccountId,
          sourceNetworkType: 'mainnet',
        }),
      ),
    ).toEqual({ step: 'idle' });
    expect(
      reducer(
        { step: 'idle' },
        actions.discoveryCompleted({ discovery, reviewedPlan }),
      ),
    ).toEqual({ step: 'idle' });
    expect(
      reducer({ step: 'idle' }, actions.sweepSucceeded({ txId: '0dc01a6e' })),
    ).toEqual({ step: 'idle' });
  });

  it('stepFailed is a no-op once the wizard is idle or done (no resurrection)', () => {
    const failed = actions.stepFailed({
      errorKey: 'migrate-wallet.error.discovery-failed',
    });
    expect(reducer({ step: 'idle' }, failed)).toEqual({ step: 'idle' });
    expect(reducer({ step: 'done', sweepTxId: '0dc01a6e' }, failed)).toEqual({
      step: 'done',
      sweepTxId: '0dc01a6e',
    });
  });

  it('walks the full happy path in order', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    expect(state.step).toBe('idle');
    const transitions: [action: Parameters<typeof reducer>[1], step: string][] =
      [
        [actions.wizardOpened(), 'intro'],
        [actions.introAcknowledged(), 'chooseDestination'],
        [actions.destinationTypeChosen({ type: 'fresh' }), 'createDestination'],
        [actions.passwordChosen(), 'backupPhrase'],
        [actions.backupAcknowledged(), 'verifyPhrase'],
        [actions.destinationCreationStarted(), 'creatingDestination'],
        [
          actions.destinationCreated({
            destinationWalletId,
            destinationAccountId,
          }),
          'chooseSource',
        ],
        [actions.sourceTypeChosen({ type: 'phrase' }), 'enterSeed'],
        [actions.sourceImportStarted(), 'importingSource'],
        [
          actions.sourceImported({
            sourceWalletId,
            sourceAccountId,
            sourceNetworkType: 'mainnet',
          }),
          'discovering',
        ],
        [actions.discoveryCompleted({ discovery, reviewedPlan }), 'review'],
        [actions.sweepStarted(), 'sweeping'],
        [actions.sweepSucceeded({ txId: '0dc01a6e' }), 'delegating'],
        [
          actions.delegationSettled({
            outcome: {
              status: 'delegated',
              txId: 'f3a91b02',
              drepId: 'drep1promoted',
              poolId: 'pool1promoted',
            },
          }),
          'done',
        ],
      ];
    for (const [action, expectedStep] of transitions) {
      state = reducer(state, action);
      expect(state.step).toBe(expectedStep);
    }
    expect(state.destinationWalletId).toBe(destinationWalletId);
    expect(state.sourceAccountId).toBe(sourceAccountId);
    expect(state.sourceNetworkType).toBe('mainnet');
    expect(state.discovery).toEqual(discovery);
    expect(state.sweepTxId).toBe('0dc01a6e');
    expect(state.delegationOutcome).toEqual({
      status: 'delegated',
      txId: 'f3a91b02',
      drepId: 'drep1promoted',
      poolId: 'pool1promoted',
    });
  });

  it.each([['already-delegated'], ['unavailable'], ['undelegated']] as const)(
    'delegationSettled → done recording a %s outcome',
    status => {
      const next = reducer(
        {
          step: 'delegating',
          errorKey: 'migrate-wallet.error.delegation-failed',
        },
        actions.delegationSettled({ outcome: { status } }),
      );
      expect(next.step).toBe('done');
      expect(next.delegationOutcome).toEqual({ status });
      expect(next.errorKey).toBeUndefined();
    },
  );

  it('delegationPaused records the phase so an abandoned finish is diagnosable', () => {
    const next = reducer(
      { step: 'delegating' },
      actions.delegationPaused({
        errorKey: 'migrate-wallet.error.delegation-failed',
        phase: 'signing',
      }),
    );
    expect(next).toEqual({
      step: 'delegationPaused',
      failedStep: 'delegating',
      errorKey: 'migrate-wallet.error.delegation-failed',
      delegationFailurePhase: 'signing',
    });
  });

  it('delegationPaused without a phase clears a stale one, so telemetry cannot inherit it', () => {
    const paused = reducer(
      { step: 'delegating', delegationFailurePhase: 'signing' },
      actions.delegationPaused({
        errorKey: 'migrate-wallet.error.delegation-failed',
      }),
    );
    expect(paused.step).toBe('delegationPaused');
    expect(paused.delegationFailurePhase).toBeUndefined();
  });

  // A straggler stepFailed can pause the wizard while the run is in flight;
  // the run's later settle is the truth and must not be dropped.
  it('delegationSettled is accepted from delegationPaused, recording the real outcome', () => {
    const next = reducer(
      {
        step: 'delegationPaused',
        errorKey: 'migrate-wallet.error.delegation-failed',
      },
      actions.delegationSettled({
        outcome: { status: 'delegated', txId: 'late1', drepId: 'drep1x' },
      }),
    );
    expect(next.step).toBe('done');
    expect(next.delegationOutcome).toEqual({
      status: 'delegated',
      txId: 'late1',
      drepId: 'drep1x',
    });
    expect(next.errorKey).toBeUndefined();
  });

  it('delegationRetryRequested re-enters delegating and clears the error', () => {
    const next = reducer(
      {
        step: 'delegationPaused',
        errorKey: 'migrate-wallet.error.delegation-failed',
        deviceWaitHintKey: 'hw-error.app-not-open.subtitle',
      },
      actions.delegationRetryRequested(),
    );
    expect(next.step).toBe('delegating');
    expect(next.errorKey).toBeUndefined();
    expect(next.deviceWaitHintKey).toBeUndefined();
  });

  // One per destination account, because the set-up is per account. The outcome
  // records only the last, which is why these are kept separately.
  it('delegationSubmitted records every set-up transaction in order', () => {
    const first = reducer(
      { step: 'delegating' },
      actions.delegationSubmitted({ txId: 'tx-a', destinationAccountIndex: 2 }),
    );
    const next = reducer(
      first,
      actions.delegationSubmitted({ txId: 'tx-b', destinationAccountIndex: 3 }),
    );
    expect(next.delegationSubmissions).toEqual([
      { txId: 'tx-a', destinationAccountIndex: 2 },
      { txId: 'tx-b', destinationAccountIndex: 3 },
    ]);
  });

  // A re-dispatch is a duplicate report; a real resubmission carries a new id.
  it('delegationSubmitted ignores a transaction it already recorded', () => {
    const first = reducer(
      { step: 'delegating' },
      actions.delegationSubmitted({ txId: 'tx-a' }),
    );
    const next = reducer(first, actions.delegationSubmitted({ txId: 'tx-a' }));
    expect(next.delegationSubmissions).toHaveLength(1);
  });

  it('delegationPaused carries the device guidance for a hardware destination', () => {
    const next = reducer(
      { step: 'delegating' },
      actions.delegationPaused({
        errorKey: 'migrate-wallet.error.delegation-failed',
        phase: 'signing',
        deviceHintKey: 'hw-error.app-not-open.subtitle',
      }),
    );
    expect(next.step).toBe('delegationPaused');
    expect(next.deviceWaitHintKey).toBe('hw-error.app-not-open.subtitle');
  });

  it('delegationAbandoned finishes on an undelegated outcome, never a silent success', () => {
    const next = reducer(
      {
        step: 'delegationPaused',
        errorKey: 'migrate-wallet.error.delegation-failed',
      },
      actions.delegationAbandoned(),
    );
    expect(next.step).toBe('done');
    expect(next.delegationOutcome).toEqual({ status: 'undelegated' });
    expect(next.errorKey).toBeUndefined();
  });

  // The generic failure screen cancels, which past the sweep would discard a
  // migration whose funds have already moved.
  it.each(['delegating', 'delegationPaused'] as const)(
    'stepFailed from %s pauses the delegation rather than failing the wizard',
    step => {
      const next = reducer(
        { step },
        actions.stepFailed({ errorKey: 'migrate-wallet.error.sweep-failed' }),
      );
      expect(next.step).toBe('delegationPaused');
      expect(next.failedStep).toBe('delegating');
      expect(next.errorKey).toBe('migrate-wallet.error.sweep-failed');
    },
  );

  // Each guard protects a different way of reporting a delegation that did not
  // happen: settling from outside `delegating`, pausing a step that is not
  // running, retrying from a screen that never failed, and abandoning one.
  it.each([
    [
      'delegationSettled',
      'review',
      () => actions.delegationSettled({ outcome: { status: 'unavailable' } }),
    ],
    [
      'delegationPaused',
      'done',
      () =>
        actions.delegationPaused({
          errorKey: 'migrate-wallet.error.delegation-failed',
        }),
    ],
    [
      'delegationRetryRequested',
      'done',
      () => actions.delegationRetryRequested(),
    ],
    ['delegationAbandoned', 'delegating', () => actions.delegationAbandoned()],
  ] as const)('%s is a no-op from %s', (_name, step, action) => {
    const before = { step } as MigrateWalletState;
    expect(reducer(before, action())).toEqual(before);
  });
});

describe('migrateWallet selectors', () => {
  const state: MigrateWalletState = {
    step: 'review',
    destinationType: 'fresh',
    destinationWalletId,
    destinationAccountId,
    sourceWalletId,
    sourceAccountId,
    sourceNetworkType: 'testnet',
    discovery,
    sweepTxId: '0dc01a6e',
    sweptFee: '180000',
    sweptRewards: '2500000',
    errorKey: 'migrate-wallet.error.sweep-failed',
    failedStep: 'sweeping',
    delegationOutcome: { status: 'undelegated' },
    delegationFailurePhase: 'submission',
    unsupportedAmount: {
      value: '1500000',
      labelKey: 'migrate-wallet.unsupported.stuck-rewards',
    },
  };
  const root = { migrateWallet: state };

  it('returns each stored field', () => {
    expect(selectors.selectStep(root)).toBe('review');
    expect(selectors.selectDestinationType(root)).toBe('fresh');
    expect(selectors.selectDestinationWalletId(root)).toBe(destinationWalletId);
    expect(selectors.selectDestinationAccountId(root)).toBe(
      destinationAccountId,
    );
    expect(selectors.selectSourceWalletId(root)).toBe(sourceWalletId);
    expect(selectors.selectSourceAccountId(root)).toBe(sourceAccountId);
    expect(selectors.selectSourceNetworkType(root)).toBe('testnet');
    expect(selectors.selectDiscovery(root)).toEqual(discovery);
    expect(selectors.selectSweepTxId(root)).toBe('0dc01a6e');
    expect(selectors.selectSweptFee(root)).toBe('180000');
    expect(selectors.selectSweptRewards(root)).toBe('2500000');
    expect(selectors.selectErrorKey(root)).toBe(
      'migrate-wallet.error.sweep-failed',
    );
    expect(selectors.selectFailedStep(root)).toBe('sweeping');
    expect(selectors.selectDelegationOutcome(root)).toEqual({
      status: 'undelegated',
    });
    expect(selectors.selectDelegationFailurePhase(root)).toBe('submission');
    expect(selectors.selectUnsupportedAmount(root)).toEqual({
      value: '1500000',
      labelKey: 'migrate-wallet.unsupported.stuck-rewards',
    });
  });

  it('selectSourceNetworkType feeds the ticker helper the account it was set from, not a live lookup', () => {
    const testnetState = reducer(
      { step: 'importingSource' },
      actions.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'testnet',
      }),
    );
    expect(
      getAdaTokenTickerByNetwork(
        selectors.selectSourceNetworkType({ migrateWallet: testnetState }),
      ),
    ).toBe('tADA');

    const mainnetState = reducer(
      { step: 'importingSource' },
      actions.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'mainnet',
      }),
    );
    expect(
      getAdaTokenTickerByNetwork(
        selectors.selectSourceNetworkType({ migrateWallet: mainnetState }),
      ),
    ).toBe('ADA');
  });

  it('selectSweepProgress returns the progress or undefined', () => {
    expect(
      selectors.selectSweepProgress({ migrateWallet: initial }),
    ).toBeUndefined();
    const withProgress: MigrateWalletState = {
      step: 'sweeping',
      sweepProgress: {
        totalChunks: 2,
        submittedChunks: [{ index: 0, txId: 'tx0' }],
      },
    };
    expect(
      selectors.selectSweepProgress({ migrateWallet: withProgress }),
    ).toEqual({
      totalChunks: 2,
      submittedChunks: [{ index: 0, txId: 'tx0' }],
    });
  });

  it('returns the pool-choice fields', () => {
    const chosen = { poolId: 'pool1abc', ticker: 'PICK', ros: 0.031 };
    const withChoice: MigrateWalletState = {
      step: 'review',
      needsPoolChoice: true,
      chosenPool: chosen,
      wasModeOffered: true,
    };
    expect(selectors.selectNeedsPoolChoice({ migrateWallet: withChoice })).toBe(
      true,
    );
    expect(selectors.selectChosenPool({ migrateWallet: withChoice })).toEqual(
      chosen,
    );
    expect(selectors.selectWasModeOffered({ migrateWallet: withChoice })).toBe(
      true,
    );
    expect(selectors.selectChosenPool({ migrateWallet: initial })).toBe(
      undefined,
    );
  });

  it('selectReviewedSweepPlan decodes the pinned plan, undefined when unset', () => {
    expect(
      selectors.selectReviewedSweepPlan({ migrateWallet: initial }),
    ).toBeUndefined();
    const afterDiscovery = reducer(
      { step: 'discovering' },
      actions.discoveryCompleted({ discovery, reviewedPlan }),
    );
    expect(
      selectors.selectReviewedSweepPlan({ migrateWallet: afterDiscovery }),
    ).toEqual(reviewedPlan);
  });
});

describe('hasNonMigratableRole', () => {
  const none = { pool: false, drep: false, proposer: false };

  it('refuses on any single attested role, so one is enough', () => {
    expect(hasNonMigratableRole({ ...none, pool: true })).toBe(true);
    expect(hasNonMigratableRole({ ...none, drep: true })).toBe(true);
    expect(hasNonMigratableRole({ ...none, proposer: true })).toBe(true);
  });

  it('allows the sweep only when every role is unattested', () => {
    expect(hasNonMigratableRole(none)).toBe(false);
  });
});

describe('backupRevisited', () => {
  it('returns to the backup screen from verification', () => {
    expect(
      reducer({ step: 'verifyPhrase' }, actions.backupRevisited()).step,
    ).toBe('backupPhrase');
  });

  // Ungated this rewinds an in-flight creation; coming forward again releases
  // the double-submit latch and crashes onboarding's app-lock setup.
  it.each(['creatingDestination', 'enterSeed', 'review', 'done'] as const)(
    'refuses to rewind from %s',
    step => {
      expect(reducer({ step }, actions.backupRevisited()).step).toBe(step);
    },
  );
});

describe('stepBack', () => {
  it.each([
    ['connectDevice', 'chooseDestination'],
    ['createDestination', 'chooseDestination'],
    ['backupPhrase', 'chooseDestination'],
    ['verifyPhrase', 'backupPhrase'],
    ['chooseDestination', 'intro'],
  ] as const)('%s steps back to %s', (from, to) => {
    expect(reducer({ step: from }, actions.stepBack()).step).toBe(to);
  });

  it('returns a hardware password step to the device picker, not the choice', () => {
    const state: MigrateWalletState = {
      step: 'createDestination',
      destinationType: 'hardware',
    };
    const next = reducer(state, actions.stepBack());

    expect(next.step).toBe('connectDevice');
    // The destination kind survives; only the device selection is discarded.
    expect(next.destinationType).toBe('hardware');
    expect(next.pendingHwDestination).toBeUndefined();
  });

  // The picker is a sub-view of chooseDestination rather than a step, so back
  // from it returns to the option list instead of leaving the step entirely.
  it('closes the existing-wallet picker before leaving the choice', () => {
    const state: MigrateWalletState = {
      step: 'chooseDestination',
      destinationType: 'existing',
    };
    const next = reducer(state, actions.stepBack());

    expect(next.step).toBe('chooseDestination');
    expect(next.destinationType).toBeUndefined();
  });

  it('clears the destination kind when returning to the choice', () => {
    const next = reducer(
      { step: 'backupPhrase', destinationType: 'fresh' },
      actions.stepBack(),
    );
    expect(next.destinationType).toBeUndefined();
  });

  // Past destination creation a wallet is persisted, so there is no earlier
  // state to restore and a stray dispatch must not invent one.
  it.each([
    'idle',
    'intro',
    'creatingDestination',
    'chooseSource',
    'importingSource',
    'discovering',
    'review',
    'sweeping',
    'done',
    'failed',
    'unsupported',
  ] as const)('is a no-op at %s', step => {
    expect(reducer({ step }, actions.stepBack())).toEqual({ step });
  });
});

describe('hasPoolLeftToChoose', () => {
  const funded = (
    sourceAccountIndex: number,
    sourcePoolId?: string,
  ): AccountMappingEntry => ({
    sourceAccountIndex,
    destinationAccountIndex: sourceAccountIndex,
    coin: '5000000',
    assetCount: 0,
    utxoCount: 1,
    ...(sourcePoolId === undefined ? {} : { sourcePoolId }),
  });

  it('asks nothing when no pool choice was owed in the first place', () => {
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: false,
        migrationMode: 'preserve',
        accountMapping: [funded(0)],
      }),
    ).toBe(false);
  });

  /**
   * The point of preservation: every migrating account already stakes
   * somewhere, so there is no pool to choose. Asking for one that would then be
   * ignored is worse than not asking.
   */
  it('asks nothing when preserve keeps every account where it stakes', () => {
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'preserve',
        accountMapping: [funded(0, 'pool1a'), funded(1, 'pool1b')],
      }),
    ).toBe(false);
  });

  it('still asks when one migrating account stakes nowhere', () => {
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'preserve',
        accountMapping: [funded(0, 'pool1a'), funded(1)],
      }),
    ).toBe(true);
  });

  /**
   * Consolidate merges the accounts, and with them any number of different
   * pools, so nothing carries over and the choice stands.
   */
  it('always asks in consolidate, however the sources are delegated', () => {
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'consolidate',
        accountMapping: [funded(0, 'pool1a'), funded(1, 'pool1b')],
      }),
    ).toBe(true);
  });

  /**
   * A PLANNED preserve run with zero migratable rows creates no landing
   * accounts, so a collected pool would be consumed by nothing — the exact
   * asked-then-ignored case this guard exists to prevent. An ABSENT plan is
   * different: nothing is known yet, so the conservative answer is to ask.
   */
  it('asks nothing when the planned preserve run migrates no rows', () => {
    const rewardsOnly = { ...funded(0), utxoCount: 0, coin: '0' };
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'preserve',
        accountMapping: [rewardsOnly],
      }),
    ).toBe(false);
  });

  it('still asks while no plan exists', () => {
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'preserve',
        accountMapping: undefined,
      }),
    ).toBe(true);
  });

  // Rows that will not migrate carry no delegation to preserve, so they must
  // not make the flow ask for a pool nothing would use.
  it('ignores rows that will not migrate', () => {
    const rewardsOnly: AccountMappingEntry = {
      ...funded(1),
      utxoCount: 0,
      coin: '0',
    };
    expect(
      hasPoolLeftToChoose({
        needsPoolChoice: true,
        migrationMode: 'preserve',
        accountMapping: [funded(0, 'pool1a'), rewardsOnly],
      }),
    ).toBe(false);
  });
});
