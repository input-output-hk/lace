import { describe, expect, it } from 'vitest';

import {
  WIZARD_PHASE_COUNT,
  wizardPath,
  wizardPhase,
  wizardProgressPercent,
} from '../../src/store/wizard-progress';

import type { MigrateWalletStep } from '../../src/store/slice';
import type { WizardPathContext } from '../../src/store/wizard-progress';

const FRESH_ONBOARDING: WizardPathContext = {
  destinationType: 'fresh',
  hasExistingWallets: false,
};
const FRESH_SETTINGS: WizardPathContext = {
  destinationType: 'fresh',
  hasExistingWallets: true,
};
const HARDWARE_ONBOARDING: WizardPathContext = {
  destinationType: 'hardware',
  hasExistingWallets: false,
};
const HARDWARE_SETTINGS: WizardPathContext = {
  destinationType: 'hardware',
  hasExistingWallets: true,
};
const EXISTING: WizardPathContext = {
  destinationType: 'existing',
  hasExistingWallets: true,
};
const UNCHOSEN: WizardPathContext = {
  destinationType: undefined,
  hasExistingWallets: false,
};

const ALL_PATHS = [
  FRESH_ONBOARDING,
  FRESH_SETTINGS,
  HARDWARE_ONBOARDING,
  HARDWARE_SETTINGS,
  EXISTING,
];

/** Every step the counter numbers, including those the rail omits. */
const IN_SEQUENCE: MigrateWalletStep[] = [
  'chooseDestination',
  'connectDevice',
  'createDestination',
  'backupPhrase',
  'verifyPhrase',
  'creatingDestination',
  'chooseLoadedSource',
  'chooseSource',
  'connectSourceDevice',
  'enterSeed',
  'importingSource',
  'discovering',
  'chooseMode',
  'connectDestinationDevice',
  'choosePool',
  'review',
  'sweeping',
  'sweepPaused',
  'delegating',
  'delegationPaused',
];

const OFF_SEQUENCE: MigrateWalletStep[] = [
  'idle',
  'intro',
  'done',
  'failed',
  'unsupported',
];

describe('wizardPhase', () => {
  // The sweep executes what the review confirmed, so the counter holds where
  // the review left it: a header that vanishes mid-flow reads as a broken
  // screen, not a finished count.
  it('keeps the sweep on the review phase', () => {
    expect(wizardPhase('sweeping', 'fresh')).toBe(5);
    expect(wizardPhase('sweepPaused', 'fresh')).toBe(5);
  });

  // The intro lists six, so the counter says six for everyone. A total that
  // varied per run would be a number the intro never mentioned.
  it('matches the phases the intro lists', () => {
    expect(WIZARD_PHASE_COUNT).toBe(6);
  });

  it('opens on the destination choice', () => {
    expect(wizardPhase('chooseDestination', undefined)).toBe(1);
  });

  it('treats the existing-wallet picker as setting up, not choosing', () => {
    expect(wizardPhase('chooseDestination', 'existing')).toBe(2);
  });

  it.each([
    'connectDevice',
    'createDestination',
    'backupPhrase',
    'verifyPhrase',
    'creatingDestination',
  ] as const)('puts %s in the set-up phase', step => {
    expect(wizardPhase(step, 'fresh')).toBe(2);
  });

  it.each(['enterSeed', 'importingSource', 'discovering'] as const)(
    'puts %s in the source-phrase phase',
    step => {
      expect(wizardPhase(step, 'fresh')).toBe(3);
    },
  );

  /**
   * The decisions phase, and the reason it exists: the review summarises
   * choices already made, so a screen that ASKS for one cannot share its
   * number. Selecting a pool inside the review's phase told the user they were
   * reviewing something they had not yet decided.
   */
  it.each(['chooseMode', 'connectDestinationDevice', 'choosePool'] as const)(
    'puts %s in the decisions phase, before the review',
    step => {
      expect(wizardPhase(step, 'fresh')).toBe(4);
      expect(wizardPhase('review', 'fresh')).toBe(5);
    },
  );

  it('ends the navigable path on review', () => {
    expect(wizardPhase('review', 'fresh')).toBe(5);
  });

  /**
   * A run asked nothing between discovery and the review goes 3 → 5, and the
   * numbers around the gap stay put. Renumbering them instead would make the
   * review's phase depend on the run, so two users comparing screens would see
   * the same screen carry different numbers.
   */
  it('leaves a gap rather than renumbering when there is nothing to decide', () => {
    expect(wizardPhase('discovering', 'fresh')).toBe(3);
    expect(wizardPhase('review', 'fresh')).toBe(5);
  });

  // The delegation is a phase the user is asked to sign for, so the counter
  // names it — unlike the sweep, which the user only waits through.
  it.each(['delegating', 'delegationPaused'] as MigrateWalletStep[])(
    'counts %s as the final phase',
    step => {
      expect(wizardPhase(step, 'fresh')).toBe(WIZARD_PHASE_COUNT);
    },
  );

  it.each(OFF_SEQUENCE)('gives %s no phase', step => {
    expect(wizardPhase(step, 'fresh')).toBeUndefined();
  });

  /**
   * A path that went backwards, or jumped over the review, would read as a
   * step having gone missing. The one legitimate jump is 3 → 5: the decisions
   * phase is conditional, so the rail never lists it.
   */
  it.each(ALL_PATHS)('visits the rail in order, never backwards', context => {
    const phases = wizardPath(context).map(step =>
      wizardPhase(
        // The picker shares its step with the option list, so the path's entry
        // for it has to be read with the destination that selects the sub-view.
        step,
        context.destinationType,
      ),
    );

    expect(phases[0]).toBeDefined();
    // The rail covers the screens the user navigates, which end at review.
    // The last phase — the delegation — is reached without a screen to click.
    expect(phases.at(-1)).toBe(WIZARD_PHASE_COUNT - 1);
    for (const [index, phase] of phases.entries()) {
      if (index === 0) continue;
      const previous = phases[index - 1] as number;
      // Holds, or advances — by two only across the decisions phase, which has
      // no rail entry of its own to sit on.
      expect((phase as number) - previous).toBeLessThanOrEqual(2);
      expect(phase as number).toBeGreaterThanOrEqual(previous);
    }
  });

  /**
   * Every step that can appear must have a number inside the promised range,
   * including the three the rail omits. A step numbered 7 would read as
   * "7 of 6".
   */
  it.each(IN_SEQUENCE)('numbers %s within the promised total', step => {
    const phase = wizardPhase(step, 'fresh') as number;
    expect(phase).toBeGreaterThanOrEqual(1);
    expect(phase).toBeLessThanOrEqual(WIZARD_PHASE_COUNT);
  });
});

describe('wizardPath', () => {
  it('walks password, backup and verification for a fresh onboarding wallet', () => {
    expect(wizardPath(FRESH_ONBOARDING)).toEqual([
      'chooseDestination',
      'createDestination',
      'backupPhrase',
      'verifyPhrase',
      'chooseSource',
      'review',
    ]);
  });

  it('drops the password step once an app-lock exists', () => {
    expect(wizardPath(FRESH_SETTINGS)).not.toContain('createDestination');
  });

  it('adds device selection for a hardware destination', () => {
    expect(wizardPath(HARDWARE_SETTINGS)).toEqual([
      'chooseDestination',
      'connectDevice',
      'chooseSource',
      'review',
    ]);
  });

  it('collects a password for hardware onboarding but never a backup', () => {
    const path = wizardPath(HARDWARE_ONBOARDING);
    expect(path).toContain('createDestination');
    expect(path).not.toContain('backupPhrase');
  });

  it('is shortest for an existing wallet destination', () => {
    expect(wizardPath(EXISTING)).toEqual([
      'chooseDestination',
      'chooseSource',
      'review',
    ]);
  });

  it.each([...ALL_PATHS, UNCHOSEN])(
    'always begins at the choice and ends at review',
    context => {
      const path = wizardPath(context);
      expect(path[0]).toBe('chooseDestination');
      expect(path.at(-1)).toBe('review');
    },
  );

  it.each(ALL_PATHS)('never lists a step twice', context => {
    const path = wizardPath(context);
    expect(new Set(path).size).toBe(path.length);
  });
});

describe('wizardProgressPercent', () => {
  it.each(ALL_PATHS)('advances monotonically to 100%', context => {
    const percents = wizardPath(context).map(
      step => wizardProgressPercent(step, context) as number,
    );

    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    expect(percents.at(-1)).toBe(100);
    expect(percents[0]).toBeGreaterThan(0);
  });

  // The wait after verification is still credited to verification; crediting it
  // to the next screen would show progress the user has not been shown yet.
  it('holds creation at the screen that triggered it', () => {
    expect(wizardProgressPercent('creatingDestination', FRESH_ONBOARDING)).toBe(
      wizardProgressPercent('verifyPhrase', FRESH_ONBOARDING),
    );

    expect(
      wizardProgressPercent('creatingDestination', HARDWARE_SETTINGS),
    ).toBe(wizardProgressPercent('connectDevice', HARDWARE_SETTINGS));
  });

  it('holds import and discovery at the source-entry screen', () => {
    const atSeed = wizardProgressPercent('enterSeed', FRESH_ONBOARDING);
    expect(wizardProgressPercent('importingSource', FRESH_ONBOARDING)).toBe(
      atSeed,
    );
    expect(wizardProgressPercent('discovering', FRESH_ONBOARDING)).toBe(atSeed);
  });

  /**
   * The rail lists only the screens a run always visits, so a conditional
   * phase-4 screen has no entry of its own. Left unmapped its index is -1 and
   * the bar vanishes for that screen alone, then returns on the review — which
   * reads as a broken screen rather than as progress.
   */
  it.each(['chooseMode', 'connectDestinationDevice', 'choosePool'] as const)(
    'holds the rail at the review while %s is asked',
    step => {
      for (const context of ALL_PATHS)
        expect(wizardProgressPercent(step, context)).toBe(
          wizardProgressPercent('review', context),
        );
    },
  );

  it.each(OFF_SEQUENCE)('gives %s no rail position', step => {
    expect(wizardProgressPercent(step, FRESH_ONBOARDING)).toBeUndefined();
  });
});

// Every other test here walks a path with `destinationType` pinned for the
// whole run, which is the one shape that cannot express this: the context
// changes under the user, `undefined` on the first screen and concrete from
// the second. These walk the (step, context) pairs a real user hits.
describe('wizardProgressPercent across a changing destination choice', () => {
  it('renders no rail while the destination is unchosen', () => {
    expect(
      wizardProgressPercent('chooseDestination', UNCHOSEN),
    ).toBeUndefined();
  });

  it('never moves backwards or stalls for a fresh onboarding user', () => {
    const walk: [MigrateWalletStep, WizardPathContext][] = [
      ['chooseDestination', UNCHOSEN],
      ['createDestination', FRESH_ONBOARDING],
      ['backupPhrase', FRESH_ONBOARDING],
      ['verifyPhrase', FRESH_ONBOARDING],
      ['enterSeed', FRESH_ONBOARDING],
      ['review', FRESH_ONBOARDING],
    ];

    const shown = walk
      .map(([step, context]) => wizardProgressPercent(step, context))
      .filter((percent): percent is number => percent !== undefined);

    // Strictly increasing: a repeated width across a screen advance is the
    // defect — 1/3 and 2/6 are the same rail, so the bar sat still exactly
    // where the counter moved.
    for (let index = 1; index < shown.length; index++) {
      expect(shown[index]).toBeGreaterThan(shown[index - 1]);
    }
    expect(shown.at(-1)).toBe(100);
  });

  it('never moves backwards or stalls for an existing-wallet user', () => {
    const walk: [MigrateWalletStep, WizardPathContext][] = [
      ['chooseDestination', UNCHOSEN],
      // The picker is still `chooseDestination`; only the choice has changed.
      ['chooseDestination', EXISTING],
      ['enterSeed', EXISTING],
      ['review', EXISTING],
    ];

    const shown = walk
      .map(([step, context]) => wizardProgressPercent(step, context))
      .filter((percent): percent is number => percent !== undefined);

    for (let index = 1; index < shown.length; index++) {
      expect(shown[index]).toBeGreaterThan(shown[index - 1]);
    }
    expect(shown.at(-1)).toBe(100);
  });
});
