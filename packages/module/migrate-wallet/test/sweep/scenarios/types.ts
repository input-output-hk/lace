import type { DerivedAccount } from '../../cardano/account';
import type { Providers } from '../../cardano/queries';
import type { SweepAssertion } from '../assertions';
import type { MigrationOutcome } from '../flow/driver';
import type { Network } from '../networks';
import type { WalletRole } from '../roles';

/** The shared actors a scenario stages and asserts against. */
export type ScenarioContext = {
  providers: Providers;
  source: DerivedAccount;
  destination: DerivedAccount;
  treasury: DerivedAccount;
  network: Network;
};

/**
 * The pre-run source snapshot every scenario captures. Scenarios needing more
 * (a token balance, say) extend it, so each owns its staged shape rather than
 * accreting scenario-specific fields onto one shared type.
 */
export type StagedSource = { sourceBefore: bigint; rewardsWithdrawn: bigint };

/** A scenario's staging and its outcome checks, typed to a shared `Staged`. */
export type ScenarioSteps<Staged extends StagedSource> = {
  /** Brings the source to the scenario's on-chain shape (idempotent). */
  stage: (context: ScenarioContext) => Promise<Staged>;
  /** Turns the migration outcome into pass/fail assertions. */
  check: (
    outcome: MigrationOutcome,
    context: ScenarioContext,
    staged: Staged,
  ) => Promise<SweepAssertion[]>;
};

/**
 * A headless preprod verification case. `run` stages the source, runs the
 * migration via the supplied `migrate`, then checks the outcome, keeping the
 * `Staged` type internal so the registry stays heterogeneous. One scenario runs
 * per invocation (selected on the CLI), so its staging never races another's.
 */
export type Scenario = {
  name: string;
  description: string;
  /**
   * The wallet role the flow migrates. Defaults to 'source' (the shared,
   * registered source). Scenarios needing a differently-shaped source (never
   * staked, pre-staked with rewards) name their own isolated role.
   */
  sourceRole?: WalletRole;
  run: (
    context: ScenarioContext,
    migrate: () => Promise<MigrationOutcome>,
  ) => Promise<SweepAssertion[]>;
};

/**
 * Pairs a concrete-typed `stage`/`check` into a type-erased `Scenario`, so each
 * scenario defines its own `Staged` shape while the registry holds a uniform
 * type. Owns the stage, exercise, and assert phase logging shared by every run.
 */
export const defineScenario = <Staged extends StagedSource>(
  meta: { name: string; description: string; sourceRole?: WalletRole },
  { stage, check }: ScenarioSteps<Staged>,
): Scenario => ({
  ...meta,
  run: async (context, migrate) => {
    console.log(`=== PHASE 1: STAGE (${context.network.name}) ===`);
    const staged = await stage(context);
    console.log(`  source ready: ${staged.sourceBefore} lovelace`);
    console.log('=== PHASE 2: EXERCISE (discovery and sweep, headless) ===');
    const outcome = await migrate();
    console.log(`  outcome: ${outcome.kind}`);
    console.log('=== PHASE 3: ASSERT ===');
    return check(outcome, context, staged);
  },
});
