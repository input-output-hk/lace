import { ContractName, inferContractContext } from '@lace-contract/module';

// Provides PostHog analytics client and event properties through platform-specific implementations
// SideEffectDependencies: PostHogRelatedSideEffectDependencies (posthog, getDefaultPostHogEventProperties)
export const posthogDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('posthog-dependency'),
  instance: 'at-least-one',
});
