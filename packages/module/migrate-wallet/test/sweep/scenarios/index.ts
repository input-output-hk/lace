import { cannotCoverFeeScenario } from './cannot-cover-fee';
import { multiPolicySourceScenario } from './multi-policy-source';
import { noSpendableInputScenario } from './no-spendable-input';
import { registeredSourceScenario } from './registered-source';
import { rewardsNotVoteDelegatedScenario } from './rewards-not-vote-delegated';
import { sweepTooLargeScenario } from './sweep-too-large';
import { sweptMultiAccountScenario } from './swept-multi-account';
import { sweptWithRewardsScenario } from './swept-with-rewards';
import { tokenBearingSourceScenario } from './token-bearing-source';
import { unregisteredSourceScenario } from './unregistered-source';

import type { Scenario } from './types';

const scenarios: Record<string, Scenario> = {
  [registeredSourceScenario.name]: registeredSourceScenario,
  [unregisteredSourceScenario.name]: unregisteredSourceScenario,
  [tokenBearingSourceScenario.name]: tokenBearingSourceScenario,
  [multiPolicySourceScenario.name]: multiPolicySourceScenario,
  [sweptWithRewardsScenario.name]: sweptWithRewardsScenario,
  [rewardsNotVoteDelegatedScenario.name]: rewardsNotVoteDelegatedScenario,
  [cannotCoverFeeScenario.name]: cannotCoverFeeScenario,
  [noSpendableInputScenario.name]: noSpendableInputScenario,
  [sweepTooLargeScenario.name]: sweepTooLargeScenario,
  [sweptMultiAccountScenario.name]: sweptMultiAccountScenario,
};

export const selectScenario = (name: string | undefined): Scenario => {
  const scenario = name === undefined ? undefined : scenarios[name];
  if (!scenario) {
    throw new Error(
      `unknown scenario "${name}", known: ${Object.keys(scenarios).join(', ')}`,
    );
  }
  return scenario;
};

export type { Scenario, ScenarioContext } from './types';
