import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { OnboardingOption } from '@lace-contract/onboarding-v2';

const loadOnboardingOptions: ContextualLaceInit<
  OnboardingOption[],
  AvailableAddons
> = async () => {
  // Return empty array for now - this module focuses on stack pages
  // The onboarding options are handled by other modules
  return [];
};

export default loadOnboardingOptions;
