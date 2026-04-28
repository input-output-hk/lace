import type { HardwareOnboardingOption, OnboardingOption } from './types';

export const isHardwareOption = (
  option: OnboardingOption,
): option is HardwareOnboardingOption => option.isHwDevice === true;
