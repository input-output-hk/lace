import type { DestinationType, MigrateWalletStep } from './slice';

export interface WizardPathContext {
  destinationType: DestinationType | undefined;
  /** An existing app-lock skips the password step, shortening the path by one. */
  hasExistingWallets: boolean;
}

/**
 * The phases the intro screen promises, in its words:
 *
 *   1. Choose a destination
 *   2. Set up that wallet
 *   3. Enter your old wallet's recovery phrase
 *   4. Choose how to migrate, and your stake pool   (only when either is asked)
 *   5. Review the migration plan, then confirm
 *   6. Set your new wallet up to earn rewards
 *
 * The counter states phases, not screens, so it matches that promise. Counting
 * screens instead gave a total of 3-6 depending on the destination — a number
 * the intro never mentioned, unknowable on the first screen, and different for
 * two users doing what they both think is the same thing.
 *
 * Phase 4 is the run's DECISIONS — the mode, a destination device, the stake
 * pool — and it is deliberately not the review's. The review summarises choices
 * already made; folding a choice into it told the user they were reviewing
 * something they had not yet decided.
 *
 * It is also the one phase a run can lack: a single-account fresh destination
 * with a promoted pool is asked nothing between discovery and the review, and
 * the counter then goes 3 → 5. The TOTAL stays 6 anyway, because the intro is
 * what the user read and it lists six: a total that changed per run would be a
 * number the intro never mentioned, unknowable on the first screen, and
 * different for two users doing what they both think is the same thing. The
 * intro says that step is conditional, so a skipped number is a step that was
 * not needed rather than a screen that failed to appear.
 */
export const WIZARD_PHASE_COUNT = 6;

export type WizardPhase = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Which phase a step belongs to, or `undefined` for screens outside the
 * sequence — the intro, the terminal outcomes, and the closed wizard.
 *
 * Every path visits all four, so the counter never skips: an existing-wallet
 * destination spends phase 2 on the wallet picker, a hardware one on device
 * selection, and a fresh one on password, backup and verification.
 */
const PHASE_BY_STEP: Record<MigrateWalletStep, WizardPhase | undefined> = {
  idle: undefined,
  intro: undefined,
  chooseDestination: 1,
  connectDevice: 2,
  createDestination: 2,
  backupPhrase: 2,
  verifyPhrase: 2,
  creatingDestination: 2,
  chooseLoadedSource: 3,
  // Phase 4, the decisions: what the user is ASKED between discovery and the
  // review. Numbered as if the run has them; `wizardPhase` closes the gap for
  // a run that does not.
  chooseMode: 4,
  connectDestinationDevice: 4,
  choosePool: 4,
  chooseSource: 3,
  connectSourceDevice: 3,
  enterSeed: 3,
  importingSource: 3,
  discovering: 3,
  review: 5,
  // The sweep executes what the review confirmed, so the counter stays put
  // through it: a header that vanishes mid-flow reads as a broken screen, not
  // a finished count.
  sweeping: 5,
  sweepPaused: 5,
  // Unlike the sweep, the delegation is a phase the intro promised and one the
  // user is asked to sign for, so the counter names it.
  delegating: 6,
  delegationPaused: 6,
  done: undefined,
  failed: undefined,
  unsupported: undefined,
};

export const wizardPhase = (
  step: MigrateWalletStep,
  destinationType: DestinationType | undefined,
): WizardPhase | undefined =>
  // The existing-wallet picker is a sub-view of `chooseDestination` and is
  // where that path does its setting up, so it reads as phase 2 rather than
  // repeating a choice the user has already made.
  step === 'chooseDestination' && destinationType === 'existing'
    ? 2
    : PHASE_BY_STEP[step];

/**
 * The screens a user is asked to act on, in order, for one destination choice.
 *
 * Drives the progress rail only. Phases are too coarse for it — a fresh-seed
 * destination spends four screens inside phase 2, and a rail that sat still
 * through all of them would look stuck.
 */
export const wizardPath = ({
  destinationType,
  hasExistingWallets,
}: WizardPathContext): MigrateWalletStep[] => {
  const path: MigrateWalletStep[] = ['chooseDestination'];

  if (destinationType === 'hardware') path.push('connectDevice');

  // Onboarding's app-lock bootstrap, so only on an installation with no wallet.
  const shouldCollectPassword =
    !hasExistingWallets &&
    (destinationType === 'fresh' || destinationType === 'hardware');
  if (shouldCollectPassword) path.push('createDestination');

  if (destinationType === 'fresh') path.push('backupPhrase', 'verifyPhrase');

  // One slot for the old wallet regardless of kind: the phrase and device
  // journeys both start at the choice screen, and only one of the two
  // follow-up screens is ever visited.
  path.push('chooseSource', 'review');
  return path;
};

/**
 * Percentage for the progress rail, or `undefined` off-sequence. Screens count
 * as complete on arrival, so the first one already shows movement — an empty
 * rail reads as "nothing has happened" when the user has in fact started.
 */
export const wizardProgressPercent = (
  step: MigrateWalletStep,
  context: WizardPathContext,
): number | undefined => {
  // No rail until the destination is chosen. `wizardPath` is a function of that
  // choice, so before it is made the denominator is a guess — the shortest of
  // the five paths — and it grows the moment the user picks. That produced a
  // bar that could not move: 1/3 and 2/6 are the same width, so the rail sat
  // still across the one advance where a frozen bar reads loudest as "nothing
  // happened". Rendering only from a settled path makes the arithmetic stable
  // rather than arranging for it to look stable.
  //
  // The screen is not left unoriented: the phase counter beside the rail reads
  // "Step 1 of 4" here, and the intro already renders no rail. An absent rail
  // is not the empty one this function's docstring argues against.
  if (context.destinationType === undefined) return undefined;

  const path = wizardPath(context);
  const total = path.length;

  // Async work between two screens belongs to the one it is completing, so the
  // rail holds still across the wait instead of jumping ahead.
  const settledStep =
    step === 'importingSource' ||
    step === 'discovering' ||
    step === 'enterSeed' ||
    step === 'connectSourceDevice' ||
    step === 'chooseLoadedSource'
      ? 'chooseSource'
      : step === 'sweeping' ||
        step === 'sweepPaused' ||
        // Every phase-4 screen anchors here. They are conditional, so the rail
        // never lists them; without this the bar disappears on the one being
        // shown and returns on the review, reading as a broken screen. All
        // three share the anchor so two decisions cannot report different
        // progress from the same phase.
        step === 'connectDestinationDevice' ||
        step === 'chooseMode' ||
        step === 'choosePool'
      ? 'review'
      : step === 'creatingDestination'
      ? path[Math.max(0, path.indexOf('chooseSource') - 1)]
      : step;

  const index = path.indexOf(settledStep);
  return index === -1 ? undefined : ((index + 1) / total) * 100;
};
