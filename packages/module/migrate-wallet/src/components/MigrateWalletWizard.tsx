import { util } from '@cardano-sdk/key-management';
import { useConfig } from '@lace-contract/app';
import {
  CardanoNetworkId,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import {
  earnRewardsPoolSelectionId,
  needsEarnRewardsPoolChoice,
  resolveEarnRewardsTarget,
} from '@lace-contract/earn-rewards';
import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import {
  Button,
  Card,
  Column,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { MIGRATE_WALLET_POOL_SELECTION_ID } from '../const';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { openWizardRef } from '../open-wizard-ref';
import { findCardanoAccount, isMigratableSourceWallet } from '../store/helpers';
import { destinationAccountName } from '../store/side-effects/prepare-destination-accounts';
import { completeTargetWithChosenPool } from '../store/side-effects/run-delegation';
import {
  discoveryHasNothingToSweep,
  hasNonMigratableRole,
  isMigratableRow,
} from '../store/slice';
import {
  WIZARD_PHASE_COUNT,
  wizardPhase,
  wizardProgressPercent,
} from '../store/wizard-progress';

import { AdaRow } from './AdaRow';
import { BackupPhraseStep } from './BackupPhraseStep';
import { cardLayout } from './card-styles';
import { ChooseDestinationStep } from './ChooseDestinationStep';
import { ChooseModeStep } from './ChooseModeStep';
import { ChooseSourceStep } from './ChooseSourceStep';
import { ConnectDeviceStep } from './ConnectDeviceStep';
import { planDelegationDisclosure } from './delegation-disclosure';
import { DestinationPasswordStep } from './DestinationPasswordStep';
import { DoneSummary } from './DoneSummary';
import { ExistingWalletPicker } from './ExistingWalletPicker';
import { formatAda } from './format-amounts';
import { LoadedSourcePicker } from './LoadedSourcePicker';
import { matchLoadedWallet } from './match-loaded-wallet';
import { buildMigrationReport } from './migration-report';
import { NoteItem } from './NoteItem';
import { resolveMappingDestinations } from './resolve-mapping-destinations';
import { ReviewSummary } from './ReviewSummary';
import { SectionRule } from './SectionRule';
import { SourceSeedStep } from './SourceSeedStep';
import { StageProgressCard } from './StageProgressCard';
import { VerifyPhraseStep } from './VerifyPhraseStep';
import { WaitingBlock } from './WaitingBlock';
import { walletTypeLabel } from './wallet-type-label';
import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';

import type { HwDeviceReadyParams } from './ConnectDeviceStep';
import type { AttestedRoles, DestinationType } from '../store/slice';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { AnyWallet, WalletId } from '@lace-contract/wallet-repo';

const INTRO_INDEX_SIZE = 24;
const INTRO_INDEX_BORDER = 1;

/** The intro's "how it works" list, in order. */
const INTRO_ITEMS = [
  'migrate-wallet.intro.item-1',
  'migrate-wallet.intro.item-2',
  'migrate-wallet.intro.item-3',
  'migrate-wallet.intro.item-4',
  'migrate-wallet.intro.item-5',
  'migrate-wallet.intro.item-6',
] as const;

/**
 * A different sentence per wait: one "please wait" for all three says nothing
 * about what is happening to the user's wallet.
 */
const PROGRESS_COPY = {
  creatingDestination: {
    title: 'migrate-wallet.progress.creating-destination',
    detail: 'migrate-wallet.progress.creating-destination-detail',
  },
  importingSource: {
    title: 'migrate-wallet.progress.importing-source',
    detail: 'migrate-wallet.progress.importing-source-detail',
  },
  discovering: {
    title: 'migrate-wallet.progress.discovering',
    detail: 'migrate-wallet.progress.discovering-detail',
  },
} as const;

/** The delegation wait's checklist — only `confirming` asks the user to act. */
const DELEGATING_STAGES = [
  { icon: 'Clock', labelKey: 'migrate-wallet.delegating.settling' },
  { icon: 'PencilEdit', labelKey: 'migrate-wallet.delegating.message' },
  { icon: 'Analytics', labelKey: 'migrate-wallet.delegating.finishing' },
] as const;
const DELEGATING_PHASE_INDEX = {
  settling: 0,
  confirming: 1,
  finishing: 2,
} as const;

/**
 * A numbered item in the intro's "how it works" list. Primary text, not
 * tertiary: this is the flow's main explanation, not fine print.
 */
const IntroItem = ({ index, text }: { index: number; text: string }) => {
  const { theme } = useTheme();
  return (
    <Row gap={spacing.M} style={styles.introItem}>
      <View style={[styles.introIndex, { borderColor: theme.border.top }]}>
        <Text.XS variant="tertiary" style={styles.introIndexText}>
          {index}
        </Text.XS>
      </View>
      <View style={styles.introItemText}>
        <Text.S style={wizardText.smallLine}>{text}</Text.S>
      </View>
    </Row>
  );
};

export const MigrateWalletWizard = () => {
  const { t } = useTranslation();
  const step = useLaceSelector('migrateWallet.selectStep');
  const destinationType = useLaceSelector(
    'migrateWallet.selectDestinationType',
  );
  const discovery = useLaceSelector('migrateWallet.selectDiscovery');
  const sweepTxId = useLaceSelector('migrateWallet.selectSweepTxId');
  const sweptFee = useLaceSelector('migrateWallet.selectSweptFee');
  const sweptRewards = useLaceSelector('migrateWallet.selectSweptRewards');
  const sweepProgress = useLaceSelector('migrateWallet.selectSweepProgress');
  const delegationOutcome = useLaceSelector(
    'migrateWallet.selectDelegationOutcome',
  );
  const delegationSubmissions = useLaceSelector(
    'migrateWallet.selectDelegationSubmissions',
  );
  const delegationPhase = useLaceSelector(
    'migrateWallet.selectDelegationPhase',
  );
  const delegationAccountNumber = useLaceSelector(
    'migrateWallet.selectDelegationAccountNumber',
  );
  const delegationAccountCount = useLaceSelector(
    'migrateWallet.selectDelegationAccountCount',
  );
  const migrationMode = useLaceSelector('migrateWallet.selectMigrationMode');
  const chosenPool = useLaceSelector('migrateWallet.selectChosenPool');
  const shouldChoosePool = useLaceSelector(
    'migrateWallet.selectNeedsPoolChoice',
  );
  const didOfferMode = useLaceSelector('migrateWallet.selectWasModeOffered');
  const accountMapping = useLaceSelector('migrateWallet.selectAccountMapping');
  const errorKey = useLaceSelector('migrateWallet.selectErrorKey');
  const failedStep = useLaceSelector('migrateWallet.selectFailedStep');
  const destinationWalletId = useLaceSelector(
    'migrateWallet.selectDestinationWalletId',
  );
  const destinationAccountId = useLaceSelector(
    'migrateWallet.selectDestinationAccountId',
  );
  const sourceWalletId = useLaceSelector('migrateWallet.selectSourceWalletId');
  const sourceAccountId = useLaceSelector(
    'migrateWallet.selectSourceAccountId',
  );
  const sourceNetworkType = useLaceSelector(
    'migrateWallet.selectSourceNetworkType',
  );
  const unsupportedAmount = useLaceSelector(
    'migrateWallet.selectUnsupportedAmount',
  );
  const pendingHwDestination = useLaceSelector(
    'migrateWallet.selectPendingHwDestination',
  );
  // The device captured for the DESTINATION's account exports — distinct from
  // `pendingHwDestination`, which is the device a newly created hardware wallet
  // was made from.
  const pendingHwDestinationDevice = useLaceSelector(
    'migrateWallet.selectPendingHwDestinationDevice',
  );
  const deviceWaitHintKey = useLaceSelector(
    'migrateWallet.selectDeviceWaitHintKey',
  );
  const wallets = useLaceSelector('wallets.selectAll');
  // Every loaded wallet's id. A source phrase deriving any of these is refused
  // at entry, because wallet-repo would dedup it and no source would appear.
  const loadedWalletIds = useMemo(
    () => wallets.map(wallet => wallet.walletId),
    [wallets],
  );

  const blockchainNetworkId = useLaceSelector(
    'cardanoContext.selectBlockchainNetworkId',
  );
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const protocolParameters = useLaceSelector(
    'cardanoContext.selectProtocolParameters',
  );
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const rewardAccountDetails = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  // What the post-sweep delegation will actually do to THIS destination —
  // the same three-way split the delegation itself makes (delegationPlan), so
  // the review discloses the outcome, not a state-blind deposit: a fresh key
  // pays the deposit; an already-staking wallet pays nothing and has its
  // voting power (only) delegated as the condition of use; a wallet with a
  // DRep is untouched.
  const hasCardanoEligibleWallet = useMemo(
    () =>
      wallets.some(
        wallet => findCardanoAccount(wallet, blockchainNetworkId) !== undefined,
      ),
    [wallets, blockchainNetworkId],
  );
  const destinationWallet = useMemo(
    () => wallets.find(w => w.walletId === destinationWalletId),
    [wallets, destinationWalletId],
  );
  // One resolution feeds both: whether a vote delegation rides the set-up
  // transaction (a property of the configured target alone — the pool choice
  // never adds or removes it) and what the review must disclose.
  const { delegationDisclosure, willDelegateVote } = useMemo(() => {
    const configured = resolveEarnRewardsTarget({ featureFlags, chainId });
    return {
      willDelegateVote: configured?.dRep !== undefined,
      delegationDisclosure: planDelegationDisclosure({
        target: completeTargetWithChosenPool(configured, chosenPool),
        stakeKeyDeposit: protocolParameters?.stakeKeyDeposit,
        accountMapping,
        migrationMode,
        destinationWallet,
        blockchainNetworkId,
        rewardAccountDetails,
        fallbackAccountId: destinationAccountId,
        preserveUnfundedSetupAccounts: discovery?.preserveUnfundedSetupAccounts,
        poolChoiceDeclined:
          shouldChoosePool === true && chosenPool === undefined,
        // Only when the run will USE it. completeTargetWithChosenPool ignores
        // a lingering pick once a pool is promoted (a flag refresh mid-run),
        // and a review crediting "the pool you chose" for a transaction that
        // joins the promoted one would misattribute the delegation.
        chosenPool: configured?.poolId === undefined ? chosenPool : undefined,
      }),
    };
  }, [
    featureFlags,
    chainId,
    chosenPool,
    shouldChoosePool,
    protocolParameters,
    accountMapping,
    migrationMode,
    destinationWallet,
    blockchainNetworkId,
    rewardAccountDetails,
    destinationAccountId,
    discovery?.preserveUnfundedSetupAccounts,
  ]);

  // Each row names the account it lands in: an existing account's real name,
  // or the exact name a planned one will be created with — the review promises
  // what the account picker will later show.
  const namedAccountMapping = useMemo(() => {
    if (!accountMapping) return undefined;
    const nameByIndex = new Map(
      (destinationWallet?.accounts ?? [])
        .filter(
          account =>
            account.blockchainName === 'Cardano' &&
            account.blockchainNetworkId === blockchainNetworkId,
        )
        .map(account => [
          (account.blockchainSpecific as { accountIndex?: number })
            ?.accountIndex ?? 0,
          account.metadata.name,
        ]),
    );
    return resolveMappingDestinations(accountMapping, migrationMode).map(
      row => ({
        ...row,
        destinationName:
          nameByIndex.get(row.destinationAccountIndex) ??
          destinationAccountName(row.destinationAccountIndex),
      }),
    );
  }, [accountMapping, destinationWallet, blockchainNetworkId, migrationMode]);

  const sourceWallet = useMemo(
    () => wallets.find(w => w.walletId === sourceWalletId),
    [wallets, sourceWalletId],
  );

  // Assembled from what was submitted, not from the plan: the report exists to
  // be checked against an explorer, so a field the state never recorded must
  // read as absent rather than be filled in from intent.
  const reportText = useMemo(
    () =>
      buildMigrationReport({
        mode: migrationMode,
        // The network's name, not its storage key: `cardano-1` tells a reader
        // checking these transactions on an explorer nothing about which chain
        // to look at.
        network: blockchainNetworkId
          ? CardanoNetworkId.getName(blockchainNetworkId) ??
            `${blockchainNetworkId}`
          : undefined,
        source: {
          name: sourceWallet?.metadata.name,
          type: sourceWallet?.type,
        },
        destination: {
          name: destinationWallet?.metadata.name,
          type: destinationWallet?.type,
        },
        // Falls back to the single receipt: only the CHUNKED path dispatches
        // `sweepChunkSubmitted`, so a one-transaction sweep — the common case —
        // has no `submittedChunks` and the report printed "Transfer
        // transactions (0)" directly beneath the txId it was reporting on.
        transactions: sweepProgress?.submittedChunks?.length
          ? sweepProgress.submittedChunks
          : sweepTxId
          ? [{ index: 0, txId: sweepTxId }]
          : [],
        retainedSourceAccountIndexes:
          migrationMode === 'preserve'
            ? accountMapping
                ?.filter(row => !isMigratableRow(row))
                .map(row => row.sourceAccountIndex)
            : undefined,
        rewardsSetup: delegationOutcome
          ? {
              status: delegationOutcome.status,
              transactions: delegationSubmissions,
            }
          : undefined,
      }),
    [
      migrationMode,
      blockchainNetworkId,
      sourceWallet,
      destinationWallet,
      sweepProgress,
      sweepTxId,
      accountMapping,
      delegationOutcome,
      delegationSubmissions,
    ],
  );
  // Loaded wallets eligible as a migration source: mnemonic wallets sign
  // through their encrypted root, hardware wallets through the device
  // connectors — each needs a Cardano account on the active network, and the
  // destination cannot migrate into itself.
  const loadedSourceCandidates = useMemo(
    () =>
      wallets.filter(
        wallet =>
          isMigratableSourceWallet(wallet) &&
          wallet.walletId !== destinationWalletId &&
          findCardanoAccount(wallet, blockchainNetworkId) !== undefined,
      ),
    [wallets, destinationWalletId, blockchainNetworkId],
  );
  const ticker = getAdaTokenTickerByNetwork(sourceNetworkType);
  const { appConfig } = useConfig();
  const explorerBaseUrl =
    chainId && appConfig?.cexplorerUrls[chainId.networkMagic];

  const openWizard = useDispatchLaceAction('migrateWallet.wizardOpened');

  useEffect(() => {
    openWizardRef.current = (origin, options) => {
      openWizard({ origin, sourceWalletId: options?.sourceWalletId });
    };
    return () => {
      openWizardRef.current = undefined;
    };
  }, [openWizard]);

  const acknowledgeIntro = useDispatchLaceAction(
    'migrateWallet.introAcknowledged',
  );
  const cancelWizard = useDispatchLaceAction('migrateWallet.wizardCancelled');
  const failStep = useDispatchLaceAction('migrateWallet.stepFailed');
  const chooseDestinationType = useDispatchLaceAction(
    'migrateWallet.destinationTypeChosen',
  );
  const selectExistingWallet = useDispatchLaceAction(
    'migrateWallet.existingWalletSelected',
  );
  const chooseSourceType = useDispatchLaceAction(
    'migrateWallet.sourceTypeChosen',
  );
  const chooseLoadedSource = useDispatchLaceAction(
    'migrateWallet.loadedSourceChosen',
  );
  const pendingSourceWalletId = useLaceSelector(
    'migrateWallet.selectPendingSourceWalletId',
  );
  // Which account each endpoint of the transfer is: the source's primary
  // account by index, the destination by the name its landing account will
  // carry (the mapping's first row — an existing wallet's fresh account, not
  // the one the picker named).
  const sourceAccountIndex = useMemo(() => {
    const account = sourceWallet?.accounts.find(
      candidate => candidate.accountId === sourceAccountId,
    );
    return (account?.blockchainSpecific as { accountIndex?: number })
      ?.accountIndex;
  }, [sourceWallet, sourceAccountId]);
  const sourceAccountLabel =
    sourceAccountIndex === undefined
      ? undefined
      : t('migrate-wallet.review.account-label', {
          index: sourceAccountIndex,
        });
  const destinationAccountLabel = namedAccountMapping?.[0]?.destinationName;

  // A pre-selected source cannot also be the destination — a wallet cannot
  // migrate into itself, so the picker never offers it.
  const destinationCandidates = useMemo(
    () => wallets.filter(w => w.walletId !== pendingSourceWalletId),
    [wallets, pendingSourceWalletId],
  );
  // A pre-selected source (the per-wallet entry) skips the chooser: resolved
  // here rather than in the reducer, because eligibility needs the wallet
  // entity — and a source that became ineligible (removed, or chosen as the
  // destination) degrades to the normal chooser instead of a dead end.
  useEffect(() => {
    if (step !== 'chooseSource' || !pendingSourceWalletId) return;
    const wallet = loadedSourceCandidates.find(
      candidate => candidate.walletId === pendingSourceWalletId,
    );
    const account = findCardanoAccount(wallet, blockchainNetworkId);
    if (!wallet || !account) return;
    chooseLoadedSource({
      sourceWalletId: wallet.walletId,
      sourceAccountId: account.accountId,
      sourceNetworkType: account.networkType,
    });
  }, [
    step,
    pendingSourceWalletId,
    loadedSourceCandidates,
    blockchainNetworkId,
    chooseLoadedSource,
  ]);

  const chooseMigrationMode = useDispatchLaceAction(
    'migrateWallet.migrationModeChosen',
  );
  const notifyDestinationDeviceConnected = useDispatchLaceAction(
    'migrateWallet.destinationDeviceConnected',
  );
  const notifyHwDeviceConnected = useDispatchLaceAction(
    'migrateWallet.hwDeviceConnected',
  );
  const choosePassword = useDispatchLaceAction('migrateWallet.passwordChosen');
  const acknowledgeBackup = useDispatchLaceAction(
    'migrateWallet.backupAcknowledged',
  );
  const revisitBackup = useDispatchLaceAction('migrateWallet.backupRevisited');
  const goBack = useDispatchLaceAction('migrateWallet.stepBack');
  const declinePoolChoice = useDispatchLaceAction(
    'migrateWallet.poolChoiceDeclined',
  );

  // The picker sheet opens over the wizard; the pick comes back through the
  // stake-pools selection slice, consumed by `consume-pool-selection` (which
  // also closes the sheet).
  const openPoolPicker = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.BrowsePool, {
      accountId: `${destinationAccountId ?? ''}`,
      poolSelectionId: MIGRATE_WALLET_POOL_SELECTION_ID,
      // The migration's own transaction, declared rather than left for the
      // picker to infer from a target it should not be reading.
      poolSelectionNotice: willDelegateVote ? 'stake-and-vote' : 'stake',
    });
  }, [destinationAccountId, willDelegateVote]);

  // Arriving at the choice takes the user straight to the pool list: the list
  // IS this step, and a screen whose only content is "there is a choice to
  // make" makes the user tap twice to reach it. Once per arrival — dismissing
  // the list without picking must reveal the step's own screen (look again, or
  // continue without the set-up), never bounce straight back into the list.
  const hasOpenedPoolPickerRef = useRef(false);
  useEffect(() => {
    if (step !== 'choosePool') {
      hasOpenedPoolPickerRef.current = false;
      return;
    }
    if (hasOpenedPoolPickerRef.current) return;
    hasOpenedPoolPickerRef.current = true;
    openPoolPicker();
  }, [step, openPoolPicker]);
  const startDestinationCreation = useDispatchLaceAction(
    'migrateWallet.destinationCreationStarted',
  );
  const startSourceImport = useDispatchLaceAction(
    'migrateWallet.sourceImportStarted',
  );
  const startSweep = useDispatchLaceAction('migrateWallet.sweepStarted');
  const refuseForRole = useDispatchLaceAction(
    'migrateWallet.attestationRefused',
  );
  const retrySweep = useDispatchLaceAction('migrateWallet.sweepRetryRequested');
  const retryDelegation = useDispatchLaceAction(
    'migrateWallet.delegationRetryRequested',
  );
  const abandonDelegation = useDispatchLaceAction(
    'migrateWallet.delegationAbandoned',
  );
  // Destination is the FIRST wallet: onboarding sets up the app-lock password.
  const attemptCreateWallet = useDispatchLaceAction(
    'onboardingV2.attemptCreateWallet',
  );
  // Source is a SECOND wallet: accountManagement reuses that app-lock (re-auths
  // instead of re-running first-run setup, which would fail).
  const attemptCreateAdditionalWallet = useDispatchLaceAction(
    'accountManagement.attemptCreateWallet',
  );
  const attemptCreateHardwareWallet = useDispatchLaceAction(
    'accountManagement.attemptCreateHardwareWallet',
  );
  // Onboarding path: first wallet, needs app-lock bootstrap + password.
  const attemptCreateHwOnboarding = useDispatchLaceAction(
    'onboardingV2.attemptCreateHardwareWallet',
  );
  const setActiveAccountContext = useDispatchLaceAction(
    'wallets.setActiveAccountContext',
  );

  // The password and the freshly generated destination phrase are held here —
  // never in redux or an intermediate action payload — until handed to
  // attemptCreateWallet in a single dispatch. Supplying the phrase makes
  // onboarding take the recovery path, which uses it verbatim and marks the
  // wallet isPassphraseConfirmed: the backup/verify steps below are the SR-10
  // gate, completed BEFORE the wallet exists, so no sheet or password
  // re-prompt is needed to display the phrase.
  const [pendingPassword, setPendingPassword] = useState<string>();
  const [pendingPhrase, setPendingPhrase] = useState<string[]>();
  // Non-migratable-role attestation: the user self-declares on the review screen
  // whether this wallet runs a stake pool, is a DRep, or has an open governance
  // proposal. Local state, never redux: the answer only gates the sweep button
  // in this render.
  const [attestedRoles, setAttestedRoles] = useState<AttestedRoles>({
    pool: false,
    drep: false,
    proposer: false,
  });
  const hasAttestedRole = hasNonMigratableRole(attestedRoles);

  // Double-submit latch. `attemptCreateWallet` runs onboarding's first-run /
  // app-lock setup, which crashes if dispatched more than once. A laggy tap on
  // the verify-confirm button re-runs the handler before the step unmounts, and
  // the early-return guard below can't catch it because the pending secrets are
  // intentionally not cleared until `enterSeed`. Latch so creation fires once.
  const destinationCreationRequested = useRef(false);

  const handleChooseDestination = useCallback(
    (type: DestinationType) => {
      chooseDestinationType({ type });
      if (type === 'fresh' && wallets.length > 0) {
        // App-lock already exists: skip the password step. Generate the
        // phrase inline and advance directly to backup.
        setPendingPhrase(util.generateMnemonicWords());
        choosePassword();
      }
    },
    [chooseDestinationType, choosePassword, wallets.length],
  );

  const handlePasswordChosen = useCallback(
    (password: string) => {
      if (destinationType === 'hardware' && pendingHwDestination) {
        if (destinationCreationRequested.current) return;
        destinationCreationRequested.current = true;
        // Hardware onboarding: password collected, now create the HW wallet.
        startDestinationCreation();
        attemptCreateHwOnboarding({
          optionId: pendingHwDestination.optionId,
          device: pendingHwDestination.device,
          accountIndex: 0,
          derivationType: pendingHwDestination.derivationType,
          blockchainName: pendingHwDestination.blockchainName,
          password,
        });
        return;
      }
      setPendingPassword(password);
      // SR-13: fresh CSPRNG entropy, same generator onboarding uses.
      setPendingPhrase(util.generateMnemonicWords());
      choosePassword();
    },
    [
      attemptCreateHwOnboarding,
      choosePassword,
      destinationType,
      pendingHwDestination,
      startDestinationCreation,
    ],
  );

  // Returns whether creation was dispatched: the verify step must not freeze
  // its controls on a call that hit one of the guards below and did nothing.
  const handlePhraseVerified = useCallback((): boolean => {
    if (destinationCreationRequested.current) return false;
    if (!pendingPhrase) return false;
    if (wallets.length === 0) {
      // Onboarding: first wallet, use onboarding path (sets up app-lock).
      if (!pendingPassword) return false;
      destinationCreationRequested.current = true;
      startDestinationCreation();
      attemptCreateWallet({
        walletName: t('migrate-wallet.destination-wallet-name'),
        blockchains: ['Cardano'],
        password: pendingPassword,
        recoveryPhrase: pendingPhrase,
      });
    } else {
      // Settings: app-lock exists, use accountManagement (re-auths via prompt).
      destinationCreationRequested.current = true;
      startDestinationCreation();
      attemptCreateAdditionalWallet({
        walletName: t('migrate-wallet.destination-wallet-name'),
        blockchains: ['Cardano'],
        recoveryPhrase: pendingPhrase,
        shouldSuppressSuccessSheet: true,
      });
    }
    // NB: the pending secrets are cleared on the `enterSeed` transition (see
    // effect below), not here — clearing them synchronously would race the
    // still-`verifyPhrase` step through the remount-recovery effect and cancel
    // the wizard we just advanced.
    return true;
  }, [
    attemptCreateAdditionalWallet,
    attemptCreateWallet,
    pendingPassword,
    pendingPhrase,
    startDestinationCreation,
    t,
    wallets.length,
  ]);

  const handleHwDeviceReady = useCallback(
    (params: HwDeviceReadyParams) => {
      if (wallets.length === 0) {
        // Onboarding: no app-lock yet, collect password first. Persist the
        // device params in Redux so a popup remount (the HW integration
        // window steals focus and Chrome closes the popup) does not lose them.
        notifyHwDeviceConnected({
          needsPassword: true,
          hwDestination: {
            optionId: params.optionId,
            device: params.device,
            blockchainName: params.blockchainName,
            derivationType: params.derivationTypes?.[0],
          },
        });
      } else {
        // Settings: app-lock exists, create immediately.
        if (destinationCreationRequested.current) return;
        destinationCreationRequested.current = true;
        notifyHwDeviceConnected({ needsPassword: false });
        attemptCreateHardwareWallet({
          optionId: params.optionId,
          device: params.device,
          accountIndex: 0,
          derivationType: params.derivationTypes?.[0],
          blockchainName: params.blockchainName,
          shouldSuppressSuccessSheet: true,
        });
      }
    },
    [attemptCreateHardwareWallet, notifyHwDeviceConnected, wallets.length],
  );

  const handleSourceSubmit = useCallback(
    (recoveryPhrase: string[]) => {
      // Re-check at the dispatch site, not just where the button is disabled.
      // This is the path that causes the harm: wallet-repo dedups the phrase and
      // the import then waits for a wallet that never appears.
      if (
        matchLoadedWallet(recoveryPhrase, {
          destinationWalletId,
          loadedWalletIds,
        })
      ) {
        return;
      }
      startSourceImport();
      attemptCreateAdditionalWallet({
        walletName: t('migrate-wallet.source-wallet-name'),
        blockchains: ['Cardano'],
        recoveryPhrase,
        // The wizard owns this journey; add-wallet's success sheet mid-flow
        // reads as the migration finishing when it has barely started.
        shouldSuppressSuccessSheet: true,
      });
    },
    [
      attemptCreateAdditionalWallet,
      destinationWalletId,
      loadedWalletIds,
      startSourceImport,
      t,
    ],
  );

  // Loaded source: no import at all — the wallet is already in the store, so
  // this goes straight to discovery under its own ids.
  const handleLoadedSourceSelected = useCallback(
    (wallet: AnyWallet) => {
      const account = findCardanoAccount(wallet, blockchainNetworkId);
      if (!account) return;
      chooseLoadedSource({
        sourceWalletId: wallet.walletId,
        sourceAccountId: account.accountId,
        sourceNetworkType: account.networkType,
      });
    },
    [blockchainNetworkId, chooseLoadedSource],
  );

  // Hardware source: the same account-creation dispatch the destination path
  // uses; the type-agnostic source watcher turns whichever wallet appears next
  // into the source. Account 0 only — a device exposes its stored account, and
  // the multi-account scan needs a derivable root the device never releases.
  const handleSourceDeviceReady = useCallback(
    (params: HwDeviceReadyParams) => {
      // The device params ride into redux so the account scan can export
      // xpubs for accounts 1+ from this same device during discovery.
      startSourceImport({
        hwSource: {
          optionId: params.optionId,
          device: params.device,
          blockchainName: params.blockchainName,
          derivationType: params.derivationTypes?.[0],
          walletName: t('migrate-wallet.source-wallet-name'),
        },
      });
      attemptCreateHardwareWallet({
        optionId: params.optionId,
        device: params.device,
        accountIndex: 0,
        derivationType: params.derivationTypes?.[0],
        blockchainName: params.blockchainName,
        // Same suffix the phrase import applies (FR-2): the retained source
        // must read as the migrated old wallet, not another device entry.
        walletName: t('migrate-wallet.source-wallet-name'),
        shouldSuppressSuccessSheet: true,
      });
    },
    [attemptCreateHardwareWallet, startSourceImport, t],
  );

  const handleConfirmSweep = useCallback(() => {
    // An attested non-migratable role (pool, DRep, or proposer) refuses here
    // rather than sweeping. Otherwise the existing sweep proceeds.
    if (hasAttestedRole) {
      refuseForRole();
      return;
    }
    startSweep();
  }, [hasAttestedRole, refuseForRole, startSweep]);

  // The password, generated phrase and (before Redux held them) the device
  // params live only in component state — never in redux, SR-2 — but the step
  // lives in redux (service worker). If the surface remounts mid-flow (e.g.
  // the extension popup closes and reopens), redux still reports a step whose
  // secrets are gone. No wallet exists yet at any of them (creation is gated
  // on verification), so recover by resetting to `idle` rather than rendering
  // a dead-end blank screen — the entry point returns and the user restarts,
  // losing only a never-used generated phrase. Cancelling also stops
  // `handlePasswordChosen` falling through to the fresh software-wallet path
  // and creating an in-memory wallet instead of the hardware destination.
  useEffect(() => {
    const hasLostPhrase =
      (step === 'backupPhrase' || step === 'verifyPhrase') &&
      pendingPhrase === undefined;
    const hasLostDevice =
      step === 'createDestination' &&
      destinationType === 'hardware' &&
      pendingHwDestination === undefined;
    if (hasLostPhrase || hasLostDevice) cancelWizard();
  }, [
    step,
    pendingPhrase,
    destinationType,
    pendingHwDestination,
    cancelWizard,
  ]);

  // Release the double-submit latch whenever we're (back) on a step that
  // precedes creation, so a legitimate retry after a failed creation can
  // dispatch again. Covers the software path (verifyPhrase), the hardware
  // onboarding path (createDestination, where the password form renders),
  // and the hardware settings path (connectDevice, where the device picker
  // dispatches creation directly).
  useEffect(() => {
    if (
      step === 'verifyPhrase' ||
      step === 'createDestination' ||
      step === 'connectDevice'
    )
      destinationCreationRequested.current = false;
  }, [step]);

  // Drop pending secrets once unusable: the wallet now exists (`enterSeed`), or
  // the user stepped back out of the destination branch, orphaning the phrase.
  // Keyed on the step *after* it changes — clearing while still on
  // `backupPhrase`/`verifyPhrase` trips the recovery effect above and cancels.
  useEffect(() => {
    if (
      step === 'enterSeed' ||
      step === 'intro' ||
      step === 'chooseDestination'
    ) {
      setPendingPassword(undefined);
      setPendingPhrase(undefined);
    }
  }, [step]);

  // SR-6 teardown. This wizard is a global overlay that never unmounts, so
  // nothing reclaims these secrets on its own: backgrounding the app on the
  // backup step would otherwise leave a plaintext phrase and the app-lock
  // password resident across the device lock. Tears down rather than merely
  // clearing, since clearing alone strands the user — nothing is created yet
  // at either step.
  //
  // Gated on 'background', not on `!== 'active'`. iOS reports 'inactive' for an
  // incoming call, a notification banner, the app switcher or Control Centre —
  // none of which means the user left. On a screen that says "write these
  // down", looking away is the task, and the phrase is regenerated on restart,
  // so tearing down on 'inactive' handed the user 20 words on paper that
  // secure nothing. The snapshot hazard 'inactive' exists for wants a screen
  // cover, which is a separate, app-wide piece of work.
  //
  // Ends on `failed` rather than silently cancelling: the words the user has
  // already written down are now void, and nothing else on screen would say so.
  useEffect(() => {
    if (step !== 'backupPhrase' && step !== 'verifyPhrase') return;

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'background') return;
      setPendingPassword(undefined);
      setPendingPhrase(undefined);
      failStep({ errorKey: 'migrate-wallet.error.backup-discarded' });
    });
    return () => {
      subscription.remove();
    };
  }, [step, failStep]);

  // Wallet-creation and wallet-import flows push celebratory "All done"
  // sheets that are redundant inside the wizard. Close them as the wizard
  // advances (a close with no sheet mounted is a no-op).
  //   - enterSeed: the HW settings path (attemptCreateHardwareWallet) and the
  //     fresh onboarding path both push a success sheet before the slice
  //     transitions here.
  //   - review: the source-import "All done" sheet fires while discovering.
  //   - discovering: the sheet is pushed asynchronously, so sweep on an
  //     interval until discovery resolves.
  useEffect(() => {
    if (step === 'enterSeed') {
      NavigationControls.closeSheet();
    }
    if (step === 'review') {
      NavigationControls.closeSheet();
      // Reset the role attestation on entry to review. The wizard is a
      // persistent overlay that does not unmount between sessions, so without
      // this a prior migration's toggles would leak into a new one and wrongly
      // refuse a valid sweep.
      setAttestedRoles({ pool: false, drep: false, proposer: false });
    }
    if (step !== 'discovering') return;
    NavigationControls.closeSheet();
    const sweepSheets = setInterval(() => {
      NavigationControls.closeSheet();
    }, 2500);
    return () => {
      clearInterval(sweepSheets);
    };
  }, [step]);

  // Close the wizard and land on a wallet's home. Sets the active account
  // context only when both ids are present (they always are at the call sites,
  // but the selectors are typed optional).
  const exitToWallet = useCallback(
    (walletId?: WalletId, accountId?: AccountId) => {
      if (walletId && accountId) {
        setActiveAccountContext({ walletId, accountId });
      }
      cancelWizard();
      // focusAccountId lands the carousel on the account just activated. The
      // carousel keeps its own index, so without it the portfolio re-shows
      // whatever card was up before the wizard — during a migration that is
      // typically the source, whose surfaces would then act for the newly
      // active destination.
      NavigationControls.navigate(
        StackRoutes.Home,
        walletId && accountId
          ? {
              screen: TabRoutes.Portfolio,
              params: { focusAccountId: `${accountId}` },
            }
          : undefined,
      );
    },
    [cancelWizard, setActiveAccountContext],
  );

  const handleFinish = useCallback(() => {
    exitToWallet(destinationWalletId, destinationAccountId);
  }, [exitToWallet, destinationAccountId, destinationWalletId]);

  // Recovery from a migration that finished undelegated. Lands on the
  // destination and opens the same flow the wizard could not complete, so the
  // unmet condition of use is one tap from being met rather than something the
  // user has to go and find.
  const handleSetUpStaking = useCallback(() => {
    exitToWallet(destinationWalletId, destinationAccountId);
    if (!destinationAccountId) return;
    // Straight to the pool list when there is a pool to choose, as every other
    // entry into this flow does.
    // The mode comes from the destination's OWN reward state, never hardcoded:
    // "finished undelegated" can be true of the run while individual accounts
    // were delegated (an abandoned second account leaves the first set up), and
    // a hardcoded first-time mode sent such an account to pick a pool for a
    // flow that would MOVE the delegation this migration just created. The
    // sheet's guards cannot catch it — a pool pick starts the flow before the
    // sheet mounts, so its Idle-gated checks never run.
    const info = rewardAccountDetails[destinationAccountId]?.rewardAccountInfo;
    const mode = info?.drepId
      ? undefined
      : info?.poolId
      ? ('vote-only' as const)
      : ('stake-and-vote' as const);
    if (
      needsEarnRewardsPoolChoice({
        target: resolveEarnRewardsTarget({ featureFlags, chainId }),
        mode,
      })
    ) {
      NavigationControls.navigate(SheetRoutes.BrowsePool, {
        accountId: destinationAccountId,
        poolSelectionId: earnRewardsPoolSelectionId(destinationAccountId),
        poolSelectionNotice: willDelegateVote ? 'stake-and-vote' : 'stake',
      });
      return;
    }
    NavigationControls.navigate(SheetRoutes.EarnRewards, {
      accountId: destinationAccountId,
    });
  }, [
    exitToWallet,
    destinationAccountId,
    destinationWalletId,
    featureFlags,
    chainId,
    willDelegateVote,
    rewardAccountDetails,
  ]);

  // Terminal refusal exit for a refused migration. The sweep can't run, but the
  // imported source is now a normal Lace wallet, so its funds stay under the
  // user's control and spendable there. Land the user on it (active context set
  // to the imported source) rather than routing through cancel to idle, which
  // renders null once wallets exist.
  const handleGoToSourceWallet = useCallback(() => {
    exitToWallet(sourceWalletId, sourceAccountId);
  }, [exitToWallet, sourceAccountId, sourceWalletId]);

  const handleCancel = useCallback(() => {
    setPendingPassword(undefined);
    setPendingPhrase(undefined);
    cancelWizard({ userInitiated: true });
  }, [cancelWizard]);

  // A failed discovery is retried in place. It has to be: the imported source
  // stays in the wallet list, and a fresh run refuses a phrase matching any
  // loaded wallet, so routing this to cancel left the first discovery failure
  // after a successful import with no in-flow way forward — and discovery
  // timing out is likeliest for exactly the large old wallets this targets.
  // Nothing has moved at this point, so re-running it costs only the scan.
  const retryDiscovery = useDispatchLaceAction(
    'migrateWallet.discoveryRetryRequested',
  );

  const handleRetry = useCallback(() => {
    if (failedStep === 'sweeping') {
      retrySweep();
    } else if (
      failedStep === 'discovering' &&
      sourceWalletId &&
      sourceAccountId &&
      sourceNetworkType
    ) {
      retryDiscovery({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType,
      });
    } else {
      handleCancel();
    }
  }, [failedStep, handleCancel, retrySweep]);

  const hasNothingToSweep =
    discovery !== undefined && discoveryHasNothingToSweep(discovery);

  // Which failures the primary can actually re-run. Naming it once keeps the
  // label, the secondary and handleRetry from disagreeing about whether this
  // screen offers a retry — the label saying "Try again" while the handler
  // cancelled is what made the discovery dead end invisible.
  const isRetryableFailure =
    failedStep === 'sweeping' ||
    step === 'sweepPaused' ||
    failedStep === 'discovering';

  // The label counts the six phases the intro promises; the rail counts actual
  // screens, which vary by destination. See `wizard-progress.ts`.
  const phase = wizardPhase(step, destinationType);
  const stepProgress = wizardProgressPercent(step, {
    destinationType,
    hasExistingWallets: wallets.length > 0,
  });
  const stepLabel = phase
    ? t('migrate-wallet.steps.n-of-m', {
        index: `${phase}`,
        total: `${WIZARD_PHASE_COUNT}`,
      })
    : undefined;

  switch (step) {
    case 'idle':
      return null;

    case 'intro':
      return (
        <WizardFrame
          title={t('migrate-wallet.intro.title')}
          primaryLabel={t('migrate-wallet.intro.start')}
          onPrimary={acknowledgeIntro}
          secondaryLabel={t('app.cancel')}
          onSecondary={handleCancel}
          testID="migrate-wallet-intro">
          <Column gap={spacing.L}>
            <Text.M style={wizardText.bodyLine}>
              {t('migrate-wallet.intro.description')}
            </Text.M>
            <Column gap={spacing.M}>
              {INTRO_ITEMS.map((key, index) => (
                <IntroItem key={key} index={index + 1} text={t(key)} />
              ))}
            </Column>
            <SectionRule />
            {/* The reason the user keeps their old phrase after migrating.
                Marked with an icon rather than set in the numbered list's
                tertiary tone, so it reads as an aside about the flow instead
                of a fifth step in it. */}
            <NoteItem text={t('migrate-wallet.intro.defi-note')} />
          </Column>
        </WizardFrame>
      );

    case 'chooseDestination':
      if (destinationType === 'existing') {
        return (
          <ExistingWalletPicker
            wallets={destinationCandidates}
            blockchainNetworkId={blockchainNetworkId}
            stepLabel={stepLabel}
            stepProgress={stepProgress}
            onSelect={selectExistingWallet}
            onBack={goBack}
            onCancel={handleCancel}
          />
        );
      }
      return (
        <ChooseDestinationStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onChoose={handleChooseDestination}
          onBack={goBack}
          onCancel={handleCancel}
          showExistingOption={hasCardanoEligibleWallet}
        />
      );

    case 'connectDevice':
      return (
        <ConnectDeviceStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onDeviceReady={handleHwDeviceReady}
          onBack={goBack}
          onCancel={handleCancel}
        />
      );

    case 'createDestination':
      return (
        <DestinationPasswordStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onBack={goBack}
          onCancel={handleCancel}
          onSubmit={handlePasswordChosen}
        />
      );

    case 'backupPhrase':
      return pendingPhrase ? (
        <BackupPhraseStep
          words={pendingPhrase}
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onContinue={acknowledgeBackup}
          onBack={goBack}
          onCancel={handleCancel}
        />
      ) : null;

    case 'verifyPhrase':
      return pendingPhrase ? (
        <VerifyPhraseStep
          words={pendingPhrase}
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onVerified={handlePhraseVerified}
          onBack={revisitBackup}
        />
      ) : null;

    case 'chooseSource':
      return (
        <ChooseSourceStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          hasLoadedCandidates={loadedSourceCandidates.length > 0}
          onChoose={type => {
            chooseSourceType({ type });
          }}
          onCancel={handleCancel}
        />
      );

    case 'chooseMode':
      return (
        <ChooseModeStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          accountCount={accountMapping?.length ?? 0}
          onChoose={mode => {
            // A hardware destination can only export account keys on-device, so
            // the device is collected before the review rather than discovered
            // missing mid-sweep. BOTH modes: consolidate lands in a fresh
            // account too (FR-13), and without the device it silently swept into
            // the picked account while the review promised a new one.
            //
            // Collected even when the planned accounts are already loaded:
            // loaded says nothing about on-chain use, and the freshness probe
            // needs the device to walk past a loaded index that turns out used.
            // Gating on "something to create" skipped the probe with the
            // device, and reused an account with history.
            //
            // Only a destination that can export reaches this screen — an
            // air-gapped family cannot preserve, so it is never offered the
            // choice.
            chooseMigrationMode({
              mode,
              needsDestinationDevice:
                destinationWallet !== undefined &&
                destinationWallet.type !== WalletType.InMemory,
            });
          }}
          onCancel={handleCancel}
        />
      );

    case 'connectDestinationDevice':
      // The device is connected and the freshness probe is running: one
      // account-key export per candidate index. The copy does NOT promise a
      // confirmation prompt — Ledger's Shelley app returns an ordinary account
      // key silently unless the device is in expert mode (see
      // `device-account-source.ts`) — so it asks the user to keep the device
      // ready and confirm only if asked.
      if (pendingHwDestinationDevice !== undefined) {
        return (
          <WizardFrame
            stepLabel={stepLabel}
            stepProgress={stepProgress}
            title={t('migrate-wallet.resolving-destinations.title')}
            testID="migrate-wallet-resolving-destinations">
            <WaitingBlock
              messages={[
                t('migrate-wallet.resolving-destinations.message'),
                t('migrate-wallet.resolving-destinations.approvals'),
              ]}
            />
          </WizardFrame>
        );
      }
      return (
        <ConnectDeviceStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          // Why the user is back here, when the probe sent them back.
          carriedError={deviceWaitHintKey ? t(deviceWaitHintKey) : undefined}
          // The destination wallet already exists, so its type says which
          // device this is — no brand to ask about.
          walletType={destinationWallet?.type}
          onDeviceReady={params => {
            notifyDestinationDeviceConnected({
              device: {
                optionId: params.optionId,
                device: params.device,
                blockchainName: params.blockchainName,
                derivationType: params.derivationTypes?.[0],
              },
            });
          }}
          onBack={goBack}
          onCancel={handleCancel}
        />
      );

    case 'chooseLoadedSource':
      return (
        <LoadedSourcePicker
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          wallets={loadedSourceCandidates}
          onSelect={handleLoadedSourceSelected}
          onBack={goBack}
          onCancel={handleCancel}
        />
      );

    case 'connectSourceDevice':
      return (
        <ConnectDeviceStep
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          onDeviceReady={handleSourceDeviceReady}
          onBack={goBack}
          onCancel={handleCancel}
        />
      );

    case 'enterSeed':
      return (
        <SourceSeedStep
          destinationWalletId={destinationWalletId}
          loadedWalletIds={loadedWalletIds}
          stepLabel={stepLabel ?? ''}
          stepProgress={stepProgress}
          onCancel={handleCancel}
          onBack={goBack}
          onSubmit={handleSourceSubmit}
        />
      );

    case 'creatingDestination':
    case 'importingSource':
    case 'discovering': {
      // A different sentence per wait: one "please wait" for all three says
      // nothing about what is happening to the user's wallet.
      const progress = PROGRESS_COPY[step];

      return (
        <WizardFrame
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          walletTag={
            step === 'creatingDestination'
              ? t('migrate-wallet.tag.new-wallet')
              : t('migrate-wallet.tag.old-wallet')
          }
          title={t(progress.title)}
          secondaryLabel={t('app.cancel')}
          onSecondary={handleCancel}
          testID="migrate-wallet-progress">
          <WaitingBlock
            messages={[t(progress.detail)]}
            testID="migrate-wallet-progress-detail"
          />
          {step === 'importingSource' && deviceWaitHintKey && (
            <Text.S
              variant="secondary"
              style={wizardText.smallLine}
              testID="migrate-wallet-device-wait-hint">
              {t(deviceWaitHintKey)}
            </Text.S>
          )}
        </WizardFrame>
      );
    }

    case 'choosePool':
      return (
        <WizardFrame
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          title={t('migrate-wallet.choose-pool.title')}
          primaryLabel={t('migrate-wallet.choose-pool.browse')}
          onPrimary={openPoolPicker}
          // Back only when a step actually sits behind this one — the mode
          // choice; the device step auto-advances and discovery has nothing to
          // return to (mirrors the reducer's guard).
          backLabel={didOfferMode ? t('migrate-wallet.nav.back') : undefined}
          onBack={didOfferMode ? goBack : undefined}
          secondaryLabel={t('app.cancel')}
          onSecondary={handleCancel}
          // Leaving discards the completed discovery scan, as on the review.
          confirmSecondary
          testID="migrate-wallet-choose-pool">
          {/* The pool list opens over this screen on arrival (see the effect
              above), so this is what the user comes back to if they dismiss it
              without picking — not the flow's presentation of the choice. It
              exists to offer the two ways forward: look again, or continue
              without the set-up. */}
          <Column gap={spacing.L} style={cardLayout.content}>
            <Text.M style={wizardText.bodyLine}>
              {t('migrate-wallet.choose-pool.body')}
            </Text.M>
            {willDelegateVote && (
              <Text.S variant="tertiary" style={wizardText.smallLine}>
                {t('migrate-wallet.choose-pool.vote-note')}
              </Text.S>
            )}
            {/* Declining must not block the migration: the sweep proceeds and
                the review states that rewards will not be set up. */}
            <Button.Secondary
              label={t('migrate-wallet.choose-pool.skip')}
              onPress={() => {
                declinePoolChoice();
              }}
              testID="migrate-wallet-choose-pool-skip"
            />
          </Column>
        </WizardFrame>
      );

    case 'review': {
      // An attested role routes the primary to the refusal, so its label must
      // not say "Continue" — that reads as consent when a refusal follows.
      const confirmLabel = hasAttestedRole
        ? t('migrate-wallet.review.confirm-attested')
        : t('migrate-wallet.review.confirm');
      return (
        <WizardFrame
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          title={t('migrate-wallet.review.title')}
          primaryLabel={
            hasNothingToSweep ? t('migrate-wallet.failed.close') : confirmLabel
          }
          onPrimary={hasNothingToSweep ? handleCancel : handleConfirmSweep}
          // With nothing to sweep the primary is already the exit, so a second
          // button running the same handler offers two doors into one room and
          // teaches that the quieter one is the costly path. One door, and the
          // confirm moves onto it: "nothing to sweep" is scoped to the active
          // network (ADR-11), so the cause may be a network the user can still
          // switch back to, and this is the last screen that says so.
          secondaryLabel={hasNothingToSweep ? undefined : t('app.cancel')}
          onSecondary={hasNothingToSweep ? undefined : handleCancel}
          confirmPrimary={hasNothingToSweep}
          // Leaving discards the completed discovery scan, which cost the
          // account walk and the reward fetch, not just a few taps.
          confirmSecondary
          testID="migrate-wallet-review">
          <ReviewSummary
            discovery={discovery}
            ticker={ticker}
            accountMapping={namedAccountMapping}
            migrationMode={migrationMode}
            hasNothingToSweep={hasNothingToSweep}
            sourceWalletName={sourceWallet?.metadata.name}
            sourceAccountLabel={sourceAccountLabel}
            destinationAccountLabel={destinationAccountLabel}
            destinationWalletName={destinationWallet?.metadata.name}
            destinationWalletType={
              destinationWallet && walletTypeLabel(destinationWallet.type)
            }
            delegationDisclosure={delegationDisclosure}
            delegatesVote={willDelegateVote}
            attestedRoles={attestedRoles}
            onAttestRole={patch => {
              setAttestedRoles(roles => ({ ...roles, ...patch }));
            }}
            hasAttestedRole={hasAttestedRole}
          />
        </WizardFrame>
      );
    }

    // Full card, not the floating banner this used to collapse into: shrinking
    // to a corner toast while funds are in flight reads as the app moving on.
    case 'sweeping':
      return (
        <WizardFrame
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          title={t('migrate-wallet.sweeping.title')}
          testID="migrate-wallet-sweeping">
          <WaitingBlock
            messages={[
              t('migrate-wallet.sweeping.message'),
              t('migrate-wallet.sweeping.do-not-close'),
            ]}
          />
        </WizardFrame>
      );

    // Same full-card wait as the sweep: the funds have moved and the wizard is
    // finishing what it started, so shrinking away here would read as done.
    case 'delegating':
      return (
        <WizardFrame
          stepLabel={stepLabel}
          title={t('migrate-wallet.delegating.title')}
          testID="migrate-wallet-delegating">
          {/* A checklist, not a caption: "confirm the prompt" while funds are
              still settling points at a prompt that does not exist, which
              reads as a hang — here that line sits dimmed until the prompt is
              actually up. */}
          <Column gap={spacing.L} style={cardLayout.content}>
            <StageProgressCard
              stages={DELEGATING_STAGES.map(({ icon, labelKey }) => ({
                icon,
                label: t(labelKey),
              }))}
              activeIndex={
                DELEGATING_PHASE_INDEX[delegationPhase ?? 'settling']
              }
              testID="migrate-wallet-delegating-stages"
            />
            {delegationAccountCount !== undefined &&
              delegationAccountCount > 1 &&
              delegationAccountNumber !== undefined && (
                <Text.S
                  variant="tertiary"
                  align="center"
                  style={wizardText.smallLine}
                  testID="migrate-wallet-delegating-account-progress">
                  {t('migrate-wallet.delegating.account-progress', {
                    number: delegationAccountNumber,
                    count: delegationAccountCount,
                  })}
                </Text.S>
              )}
            <Text.S
              variant="tertiary"
              align="center"
              style={wizardText.smallLine}>
              {t('migrate-wallet.delegating.do-not-close')}
            </Text.S>
          </Column>
        </WizardFrame>
      );

    // Retry or finish undelegated. Never cancel: the sweep has already moved
    // the funds, so there is no migration left to abandon — only a delegation.
    case 'delegationPaused':
      return (
        <WizardFrame
          stepLabel={stepLabel}
          title={t('migrate-wallet.delegation-paused.title')}
          primaryLabel={t('migrate-wallet.failed.retry')}
          onPrimary={retryDelegation}
          secondaryLabel={t('migrate-wallet.delegation-paused.finish')}
          onSecondary={abandonDelegation}
          confirmSecondary
          testID="migrate-wallet-delegation-paused">
          <Column gap={spacing.S}>
            <Text.M style={wizardText.bodyLine}>
              {errorKey ? t(errorKey) : ''}
            </Text.M>
            {deviceWaitHintKey && (
              <Text.S
                variant="secondary"
                style={wizardText.smallLine}
                testID="migrate-wallet-device-error-hint">
                {t(deviceWaitHintKey)}
              </Text.S>
            )}
          </Column>
        </WizardFrame>
      );

    case 'done':
      return (
        <WizardFrame
          title={t('migrate-wallet.done.title')}
          primaryLabel={t('migrate-wallet.done.confirm')}
          onPrimary={handleFinish}
          testID="migrate-wallet-done">
          <DoneSummary
            discovery={discovery}
            ticker={ticker}
            destinationWalletName={destinationWallet?.metadata.name}
            sweepTxId={sweepTxId}
            sweepTxIds={sweepProgress?.submittedChunks.map(({ txId }) => txId)}
            sweptFee={sweptFee}
            sweptRewards={sweptRewards}
            explorerBaseUrl={explorerBaseUrl}
            delegationOutcome={delegationOutcome}
            onSetUpStaking={handleSetUpStaking}
            reportText={reportText}
          />
        </WizardFrame>
      );

    case 'unsupported':
      return (
        <WizardFrame
          title={t('migrate-wallet.unsupported.title')}
          primaryLabel={t('migrate-wallet.unsupported.go-to-wallet')}
          onPrimary={handleGoToSourceWallet}
          testID="migrate-wallet-unsupported">
          <Column gap={spacing.L}>
            <Text.M
              style={wizardText.bodyLine}
              testID="migrate-wallet-unsupported-reason">
              {errorKey ? t(errorKey) : ''}
            </Text.M>
            {unsupportedAmount && (
              <Card cardStyle={cardLayout.card}>
                <Text.S variant="tertiary" style={wizardText.smallLine}>
                  {t(unsupportedAmount.labelKey)}
                </Text.S>
                <AdaRow
                  amount={formatAda(unsupportedAmount.value, ticker)}
                  valueTestID="migrate-wallet-unsupported-amount"
                />
              </Card>
            )}
            <Text.S variant="tertiary" style={wizardText.smallLine}>
              {t('migrate-wallet.unsupported.nothing-moved')}
            </Text.S>
          </Column>
        </WizardFrame>
      );

    case 'sweepPaused':
    case 'failed':
      return (
        <WizardFrame
          stepLabel={stepLabel}
          stepProgress={stepProgress}
          title={t('migrate-wallet.failed.title')}
          primaryLabel={
            isRetryableFailure
              ? t('migrate-wallet.failed.retry')
              : t('migrate-wallet.failed.close')
          }
          onPrimary={handleRetry}
          secondaryLabel={isRetryableFailure ? t('app.cancel') : undefined}
          onSecondary={isRetryableFailure ? handleCancel : undefined}
          testID="migrate-wallet-failed">
          <Column gap={spacing.S}>
            <Text.M style={wizardText.bodyLine}>
              {errorKey ? t(errorKey) : ''}
            </Text.M>
            {/* What to do about the device, when a device is what stopped this.
                The failure key only says the step stopped. */}
            {deviceWaitHintKey && (
              <Text.S
                variant="secondary"
                style={wizardText.smallLine}
                testID="migrate-wallet-device-error-hint">
                {t(deviceWaitHintKey)}
              </Text.S>
            )}
          </Column>
        </WizardFrame>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
  introItem: {
    alignItems: 'flex-start',
  },
  introIndex: {
    width: INTRO_INDEX_SIZE,
    height: INTRO_INDEX_SIZE,
    borderRadius: INTRO_INDEX_SIZE / 2,
    borderWidth: INTRO_INDEX_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The digit centres itself rather than relying on the circle's flex
  // centring, which leaves it visibly high and slightly off to one side: the
  // default line box reserves descender space no digit uses, and a glyph as
  // narrow as "1" is not centred within its own advance width.
  introIndexText: {
    width: '100%',
    textAlign: 'center',
    lineHeight: INTRO_INDEX_SIZE - INTRO_INDEX_BORDER * 2,
  },
  introItemText: {
    flex: 1,
  },
});
