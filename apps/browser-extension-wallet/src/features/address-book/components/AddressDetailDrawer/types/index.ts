import type { TranslationKey } from '@lace/translation';

export enum AddressDetailsSteps {
  DETAILS,
  CREATE,
  EDIT
}

export interface AddressDetailsSectionConfig {
  currentSection: AddressDetailsSteps;
  nextSection?: AddressDetailsSteps;
  prevSection?: AddressDetailsSteps;
  headerTitle?: TranslationKey;
  headerSubtitle?: TranslationKey;
}

export type AddressDetailsConfig = Partial<Record<AddressDetailsSteps, AddressDetailsSectionConfig>>;
